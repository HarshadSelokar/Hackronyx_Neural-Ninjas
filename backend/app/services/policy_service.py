from app.database import get_db
from datetime import date
from typing import Dict, Any, List

def evaluate_policy(category: str, amount: float, employee_id: str, expense_date: str, has_receipt: bool) -> Dict[str, Any]:
    with get_db() as cur:
        cur.execute("""
            SELECT * FROM public.expense_policies 
            WHERE LOWER(category) = LOWER(%s) AND is_active = true
            LIMIT 1;
        """, (category,))
        policy = cur.fetchone()

    if not policy:
        return {
            "policy_status": "compliant",
            "violations": [],
            "policy_limit": None,
            "exceeded_by": 0.0,
            "policy_details": None
        }

    violations: List[str] = []
    policy_limit = float(policy["max_amount_per_transaction"]) if policy["max_amount_per_transaction"] else None
    exceeded_by = 0.0

    # 1. Transaction limit
    if policy_limit is not None and amount > policy_limit:
        exceeded_by = amount - policy_limit
        violations.append(f"Exceeds {category} per-transaction limit of ₹{policy_limit:,.2f} by ₹{exceeded_by:,.2f}")

    # 2. Receipt requirement
    if policy["receipt_required"] and not has_receipt:
        violations.append(f"Policy requires an itemized receipt for {category} expenses")

    # 3. Daily limit check
    if policy["max_amount_per_day"]:
        daily_limit = float(policy["max_amount_per_day"])
        with get_db() as cur:
            cur.execute("""
                SELECT COALESCE(SUM(amount), 0) as day_total
                FROM public.expenses
                WHERE employee_id = %s 
                  AND LOWER(category) = LOWER(%s) 
                  AND expense_date = %s
                  AND status NOT IN ('rejected');
            """, (employee_id, category, expense_date))
            day_total = float(cur.fetchone()["day_total"]) + amount
            if day_total > daily_limit:
                violations.append(f"Exceeds {category} daily limit of ₹{daily_limit:,.2f} (Total today: ₹{day_total:,.2f})")

    status = "violation" if violations else "compliant"
    return {
        "policy_status": status,
        "violations": violations,
        "policy_limit": policy_limit,
        "exceeded_by": exceeded_by,
        "policy_details": {
            "category": policy["category"],
            "max_amount_per_transaction": policy_limit,
            "receipt_required": policy["receipt_required"],
            "description": policy["description"]
        }
    }
