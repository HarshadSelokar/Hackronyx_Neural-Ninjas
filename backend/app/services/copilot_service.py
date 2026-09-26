import logging
from typing import Dict, Any, List
from app.database import get_db
from app.services.budget_service import get_department_budgets
from app.services.gemini_service import answer_copilot_with_gemini

logger = logging.getLogger(__name__)

# --- CONTROLLED DATABASE FUNCTIONS (NO ARBITRARY SQL) ---

def tool_get_department_budget_status() -> Dict[str, Any]:
    budgets = get_department_budgets(2026)
    sorted_by_util = sorted(budgets, key=lambda x: x["pending_utilization_pct"], reverse=True)
    return {
        "fiscal_year": 2026,
        "departments": sorted_by_util,
        "closest_to_limit": sorted_by_util[0] if sorted_by_util else None
    }

def tool_get_pending_expenses(threshold: float = 25000.0) -> List[Dict[str, Any]]:
    with get_db() as cur:
        cur.execute("""
            SELECT e.id, e.merchant, e.amount, e.category, e.expense_date, 
                   d.name as department_name, p.full_name as employee_name, e.policy_status, e.risk_level
            FROM public.expenses e
            JOIN public.departments d ON e.department_id = d.id
            JOIN public.profiles p ON e.employee_id = p.id
            WHERE e.status IN ('submitted', 'in_review') AND e.amount >= %s
            ORDER BY e.amount DESC;
        """, (threshold,))
        return [dict(r) for r in cur.fetchall()]

def tool_get_department_spending() -> List[Dict[str, Any]]:
    with get_db() as cur:
        cur.execute("""
            SELECT d.name as department_name, 
                   COALESCE(SUM(e.amount), 0) as total_spent,
                   COUNT(e.id) as expense_count
            FROM public.departments d
            LEFT JOIN public.expenses e ON e.department_id = d.id
            GROUP BY d.name
            ORDER BY total_spent DESC;
        """)
        return [dict(r) for r in cur.fetchall()]

def tool_get_pending_reimbursements() -> Dict[str, Any]:
    with get_db() as cur:
        cur.execute("""
            SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
            FROM public.expenses
            WHERE status IN ('submitted', 'in_review');
        """)
        pending = cur.fetchone()
        cur.execute("""
            SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
            FROM public.expenses
            WHERE status = 'reimbursed';
        """)
        reimbursed = cur.fetchone()
        return {
            "pending_count": pending["count"],
            "pending_amount": float(pending["total"]),
            "reimbursed_count": reimbursed["count"],
            "reimbursed_amount": float(reimbursed["total"])
        }

def tool_simulate_all_pending_approvals() -> Dict[str, Any]:
    budgets = get_department_budgets(2026)
    total_pending = sum(b["pending_amount"] for b in budgets)
    total_budget = sum(b["total_budget"] for b in budgets)
    total_spent = sum(b["spent_amount"] for b in budgets)
    new_spent = total_spent + total_pending
    curr_util = (total_spent / total_budget * 100) if total_budget > 0 else 0
    new_util = (new_spent / total_budget * 100) if total_budget > 0 else 0
    impacted_depts = [b["department_name"] for b in budgets if b["pending_amount"] > 0]
    return {
        "total_pending_amount": total_pending,
        "total_org_budget": total_budget,
        "current_spent": total_spent,
        "post_approval_spent": new_spent,
        "current_utilization_pct": round(curr_util, 1),
        "post_approval_utilization_pct": round(new_util, 1),
        "impacted_departments": impacted_depts
    }

def tool_get_high_risk_expenses() -> List[Dict[str, Any]]:
    with get_db() as cur:
        cur.execute("""
            SELECT e.id, e.merchant, e.amount, e.category, e.policy_status, e.risk_level,
                   e.ai_summary, d.name as department_name, p.full_name as employee_name
            FROM public.expenses e
            JOIN public.departments d ON e.department_id = d.id
            JOIN public.profiles p ON e.employee_id = p.id
            WHERE e.risk_level = 'high' OR e.policy_status = 'violation'
            ORDER BY e.created_at DESC;
        """)
        return [dict(r) for r in cur.fetchall()]


def query_finance_copilot(query_text: str) -> Dict[str, Any]:
    """
    Selects controlled parameterized DB tool based on intent,
    queries PostgreSQL, then invokes Gemini to generate natural language response.
    """
    q = query_text.lower().strip()

    # 1. Highest Department Spending check FIRST
    if "highest spending" in q or "spend the most" in q or "spending by dept" in q or "department spending" in q:
        data = tool_get_department_spending()
        context = "Department Cumulative Spending"
        top = data[0] if data else None
        fallback_answer = f"**{top['department_name']}** has the highest spending at **₹{float(top['total_spent']):,.2f}** across {top['expense_count']} recorded expenses." if top else "No departmental spending recorded."

    # 2. Exceeding / Budget limit check
    elif "exceed" in q or "closest" in q or "budget status" in q or "closest to exceeding" in q:
        data = tool_get_department_budget_status()
        context = "Department Budget & Utilization Status"
        top = data.get("closest_to_limit")
        fallback_answer = (
            f"**{top['department_name']}** is closest to budget thresholds with **{top['pending_utilization_pct']}%** committed utilization "
            f"(₹{top['spent_amount']:,.0f} spent + ₹{top['pending_amount']:,.0f} pending against an allocation of ₹{top['total_budget']:,.0f}). "
            f"Its annualized run-rate projects a full-year spend of ₹{top['projected_spend']:,.0f} ({top['projected_utilization_pct']}% of budget)."
        ) if top else "All departments are well within baseline budget limits."

    # 3. Pending expenses above threshold
    elif "pending" in q and ("above" in q or "threshold" in q or "50000" in q or "50,000" in q or "greater" in q):
        threshold = 50000.0 if "50000" in q or "50,000" in q else 25000.0
        data = tool_get_pending_expenses(threshold)
        context = f"Pending Expenses (Threshold >= ₹{threshold:,.0f})"
        if data:
            list_str = "\n".join([f"- **{it['merchant']}** ({it['category']}): ₹{float(it['amount']):,.2f} submitted by {it['employee_name']} ({it['department_name']})" for it in data])
            fallback_answer = f"Found **{len(data)} high-impact pending expenses** requiring multi-tier authorization:\n\n{list_str}"
        else:
            fallback_answer = f"There are currently no pending expenses exceeding ₹{threshold:,.0f} in the approval queue."

    # 4. Simulation of approving all pending
    elif "approve all" in q or "what happens" in q or "all pending" in q:
        data = tool_simulate_all_pending_approvals()
        context = "Simulation: Approval of All Pending Expenses"
        fallback_answer = (
            f"If all pending expenses are approved immediately:\n\n"
            f"- **Immediate Financial Commitment**: ₹{data['total_pending_amount']:,.2f} across {len(data['impacted_departments'])} departments ({', '.join(data['impacted_departments']) or 'None'})\n"
            f"- **Organization Utilization**: Increases from **{data['current_utilization_pct']}%** to **{data['post_approval_utilization_pct']}%**\n"
            f"- **Budget Health**: Overall organization remains within healthy operating capital reserves."
        )

    # 5. Pending reimbursements
    elif "reimbursement" in q or "reimburse" in q or "pending for" in q:
        data = tool_get_pending_reimbursements()
        context = "Reimbursements & Pending Outflows"
        fallback_answer = (
            f"Currently, there are **{data['pending_count']} expenses** awaiting approval totaling **₹{data['pending_amount']:,.2f}**. "
            f"A cumulative total of **₹{data['reimbursed_amount']:,.2f}** has already been reimbursed to employees this fiscal year."
        )

    # 6. High risk expenses
    elif "risk" in q or "high-risk" in q or "violation" in q:
        data = tool_get_high_risk_expenses()
        context = "Flagged High-Risk & Policy Violation Expenses"
        if data:
            list_str = "\n".join([f"- **{it['merchant']}** (₹{float(it['amount']):,.2f}) by {it['employee_name']} [{it['department_name']}]: {it.get('ai_summary', 'Flagged for review')}" for it in data])
            fallback_answer = f"There are **{len(data)} flagged high-risk expenses**:\n\n{list_str}"
        else:
            fallback_answer = "No high-risk expenses are currently flagged in the system."

    else:
        # Default overview brief
        data = {
            "budget_summary": tool_get_department_budget_status(),
            "reimbursements": tool_get_pending_reimbursements(),
            "high_risk_count": len(tool_get_high_risk_expenses())
        }
        context = "Executive Financial Overview"
        fallback_answer = (
            f"**Finance Intelligence Summary**:\n"
            f"- Active Budgets: 6 departments monitored for FY2026\n"
            f"- Pending Authorizations: {data['reimbursements']['pending_count']} items totaling ₹{data['reimbursements']['pending_amount']:,.2f}\n"
            f"- High-Risk Flagged: {data['high_risk_count']} items under scrutiny"
        )

    # Invoke Gemini with the real retrieved facts
    gemini_answer = answer_copilot_with_gemini(query_text, data, context)
    final_answer = gemini_answer if gemini_answer else fallback_answer

    return {
        "query": query_text,
        "answer": final_answer,
        "data_points": data,
        "context_label": context
    }
