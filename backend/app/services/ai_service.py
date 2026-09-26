import re
import random
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from app.database import get_db
from app.services.policy_service import evaluate_policy
from app.services.budget_service import get_budget_for_department
from app.services.gemini_service import extract_receipt_with_gemini, analyze_expense_with_gemini

def extract_receipt_data(filename: str, file_content: Optional[bytes] = None) -> Dict[str, Any]:
    """
    Intelligent receipt OCR parser with Gemini AI and deterministic fallback.
    """
    # 1. Try Gemini Multimodal Vision first if file content is provided
    if file_content and len(file_content) > 10:
        gemini_extracted = extract_receipt_with_gemini(filename, file_content)
        if gemini_extracted and gemini_extracted.get("amount"):
            return {
                "merchant": gemini_extracted.get("merchant", "Extracted Merchant"),
                "amount": float(gemini_extracted.get("amount", 0.0)),
                "category": gemini_extracted.get("category", "Other"),
                "expense_date": gemini_extracted.get("expense_date", date.today().isoformat()),
                "invoice_number": gemini_extracted.get("invoice_number", f"INV-{random.randint(10000, 99999)}"),
                "tax_amount": float(gemini_extracted.get("tax", 0.0)) if gemini_extracted.get("tax") else None,
                "description": gemini_extracted.get("description", "Receipt extracted with Gemini AI"),
                "confidence": 0.98,
                "ai_engine": "Gemini Multimodal Vision"
            }

    # 2. Genuine fallback: return empty fields requiring user verification/input
    # Never fabricate fake merchants or amounts
    return {
        "merchant": "",
        "amount": None,
        "category": "Other",
        "expense_date": date.today().isoformat(),
        "invoice_number": "",
        "tax_amount": None,
        "description": f"Uploaded document: {filename}. Please enter and verify line items.",
        "confidence": 0.0,
        "ai_engine": "Manual Entry (OCR Extraction Pending/Unavailable)"
    }

def detect_duplicates(merchant: str, amount: float, invoice_number: str, expense_date: str, exclude_id: Optional[str] = None) -> Dict[str, Any]:
    with get_db() as cur:
        query = """
            SELECT id, merchant, amount, invoice_number, expense_date, status
            FROM public.expenses
            WHERE (
                (invoice_number IS NOT NULL AND LOWER(invoice_number) = LOWER(%s) AND invoice_number != '')
                OR (LOWER(merchant) = LOWER(%s) AND ABS(amount - %s) < 1.0 AND ABS(expense_date - %s::date) <= 5)
            )
        """
        params = [invoice_number or "---", merchant, amount, expense_date]
        if exclude_id:
            query += " AND id != %s"
            params.append(exclude_id)
        query += " LIMIT 1;"
        
        cur.execute(query, tuple(params))
        match = cur.fetchone()

    if match:
        sim = 98 if (invoice_number and match["invoice_number"] == invoice_number) else 85
        return {
            "duplicate_detected": True,
            "matched_expense_id": str(match["id"]),
            "matched_merchant": match["merchant"],
            "matched_amount": float(match["amount"]),
            "matched_invoice": match["invoice_number"],
            "similarity_pct": sim,
            "warning": f"Possible duplicate of Expense #{str(match['id'])[:8]} ({match['merchant']} - ₹{float(match['amount']):,.2f})"
        }
    return {
        "duplicate_detected": False,
        "matched_expense_id": None,
        "similarity_pct": 0,
        "warning": None
    }

def detect_anomalies(employee_id: str, category: str, amount: float) -> Dict[str, Any]:
    with get_db() as cur:
        cur.execute("""
            SELECT COALESCE(AVG(amount), 0) as avg_amt, COUNT(*) as cnt
            FROM public.expenses
            WHERE employee_id = %s AND status NOT IN ('rejected');
        """, (employee_id,))
        res = cur.fetchone()

    avg_amt = float(res["avg_amt"])
    cnt = int(res["cnt"])

    if cnt < 2:
        return {
            "anomaly": False,
            "historical_average": avg_amt or amount,
            "multiplier": 1.0,
            "signals": ["First or second expense for employee; establishing baseline."]
        }

    multiplier = (amount / avg_amt) if avg_amt > 0 else 1.0
    signals = []
    is_anomaly = False

    if multiplier >= 3.0:
        is_anomaly = True
        signals.append(f"Expense is {multiplier:.1f}× higher than employee historical average (₹{avg_amt:,.2f})")
    elif multiplier >= 2.0:
        signals.append(f"Expense is {multiplier:.1f}× above typical spending level")

    if amount > 50000:
        is_anomaly = True
        signals.append("High financial velocity: transaction amount exceeds ₹50,000 corporate threshold")

    return {
        "anomaly": is_anomaly,
        "historical_average": round(avg_amt, 2),
        "multiplier": round(multiplier, 1),
        "signals": signals if signals else ["Consistent with employee historical spending patterns"]
    }

def generate_ai_analysis(
    employee_id: str,
    department_id: str,
    category: str,
    amount: float,
    merchant: str,
    expense_date: str,
    invoice_number: str,
    has_receipt: bool,
    exclude_expense_id: Optional[str] = None
) -> Dict[str, Any]:
    # 1. Authoritative Backend Policy Check (arithmetic)
    policy_res = evaluate_policy(category, amount, employee_id, expense_date, has_receipt)
    
    # 2. Authoritative Duplicate Detection
    dup_res = detect_duplicates(merchant, amount, invoice_number, expense_date, exclude_expense_id)
    
    # 3. Authoritative Anomaly Detection
    anomaly_res = detect_anomalies(employee_id, category, amount)
    
    # 4. Department Budget Context
    dept_budget = get_budget_for_department(department_id)
    budget_util = dept_budget["utilization_pct"] if dept_budget else 0.0

    # 5. Try Gemini AI reasoning over backend facts
    expense_data = {
        "merchant": merchant,
        "amount": amount,
        "category": category,
        "expense_date": expense_date,
        "invoice_number": invoice_number,
        "has_receipt": has_receipt
    }
    gemini_analysis = analyze_expense_with_gemini(
        expense_data=expense_data,
        policy_result=policy_res,
        duplicate_result=dup_res,
        anomaly_result=anomaly_res,
        budget_info=dept_budget
    )

    if gemini_analysis and gemini_analysis.get("reasons"):
        reasons = gemini_analysis["reasons"]
        ai_summary = gemini_analysis.get("ai_summary", "")
        recommendation = gemini_analysis.get("recommendation", "standard_approval_review")
        risk_level = gemini_analysis.get("risk_level", "medium")
    else:
        # Fallback deterministic reasoning
        reasons = []
        risk_points = 0

        if policy_res["policy_status"] == "violation":
            risk_points += 40
            reasons.extend(policy_res["violations"])
        else:
            reasons.append(f"✓ Policy compliant for {category}")

        if dup_res["duplicate_detected"]:
            risk_points += 50
            reasons.append(f"⚠ {dup_res['warning']} ({dup_res['similarity_pct']}% similarity)")
        else:
            reasons.append("✓ No duplicate detected in historical records")

        if anomaly_res["anomaly"]:
            risk_points += 30
            reasons.extend([f"⚠ {s}" for s in anomaly_res["signals"]])
        else:
            reasons.append("✓ Consistent with historical spending behavior")

        if budget_util > 90:
            risk_points += 25
            reasons.append(f"⚠ Department budget utilization is critical ({budget_util:.1f}%)")
        elif budget_util > 75:
            risk_points += 15
            reasons.append(f"⚠ Department budget utilization is high ({budget_util:.1f}%)")

        if risk_points >= 40:
            risk_level = "high"
            recommendation = "finance_review" if amount >= 25000 else "manager_scrutiny_required"
        elif risk_points >= 20:
            risk_level = "medium"
            recommendation = "manager_scrutiny_required"
        else:
            risk_level = "low"
            recommendation = "auto_approve_eligible"

        summary_parts = []
        if policy_res["policy_status"] == "violation":
            summary_parts.append(f"Policy violation detected ({reasons[0]}).")
        if dup_res["duplicate_detected"]:
            summary_parts.append("Potential duplicate flagged.")
        if anomaly_res["anomaly"]:
            summary_parts.append(f"Spending spike ({anomaly_res['multiplier']}× employee average).")
        if not summary_parts:
            summary_parts.append("Standard compliant expense with clean verification.")
        ai_summary = " ".join(summary_parts)

    structured_analysis = {
        "category": category,
        "confidence": 0.97,
        "policy_compliant": policy_res["policy_status"] == "compliant",
        "duplicate_detected": dup_res["duplicate_detected"],
        "anomaly": anomaly_res["anomaly"],
        "budget_impact": "high" if amount >= 25000 else ("medium" if amount >= 5000 else "low"),
        "recommendation": recommendation,
        "reasons": reasons,
        "details": {
            "policy": policy_res,
            "duplicate": dup_res,
            "anomaly": anomaly_res,
            "department_budget_utilization": budget_util
        }
    }

    return {
        "policy_status": policy_res["policy_status"],
        "risk_level": risk_level,
        "ai_recommendation": recommendation,
        "ai_summary": ai_summary,
        "ai_analysis": structured_analysis
    }
