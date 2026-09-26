from app.database import get_db
from typing import Dict, Any, List
from datetime import datetime

def get_department_budgets(fiscal_year: int = 2026) -> List[Dict[str, Any]]:
    with get_db() as cur:
        cur.execute("""
            SELECT 
                b.id as budget_id,
                b.department_id,
                d.name as department_name,
                d.description as department_desc,
                b.fiscal_year,
                b.total_amount,
                COALESCE(SUM(CASE WHEN e.status IN ('approved', 'reimbursed') THEN e.amount ELSE 0 END), 0) as spent_amount,
                COALESCE(SUM(CASE WHEN e.status IN ('submitted', 'in_review') THEN e.amount ELSE 0 END), 0) as pending_amount,
                COUNT(e.id) as total_expenses_count
            FROM public.budgets b
            JOIN public.departments d ON b.department_id = d.id
            LEFT JOIN public.expenses e ON e.department_id = d.id 
                AND EXTRACT(YEAR FROM e.expense_date) = b.fiscal_year
            WHERE b.fiscal_year = %s
            GROUP BY b.id, b.department_id, d.name, d.description, b.fiscal_year, b.total_amount
            ORDER BY d.name;
        """, (fiscal_year,))
        rows = cur.fetchall()

    result = []
    # Current month (1 to 12) for run-rate projection
    current_month = max(1, datetime.now().month)

    for r in rows:
        total = float(r["total_amount"])
        spent = float(r["spent_amount"])
        pending = float(r["pending_amount"])
        remaining = total - spent
        utilization = (spent / total * 100) if total > 0 else 0.0
        pending_utilization = ((spent + pending) / total * 100) if total > 0 else 0.0

        # Run rate estimation: projected annual spend
        monthly_avg = spent / current_month if current_month > 0 else spent
        projected_spend = monthly_avg * 12
        projected_utilization = (projected_spend / total * 100) if total > 0 else 0.0
        potential_overspend = max(0.0, projected_spend - total)

        status_risk = "low"
        if pending_utilization > 100 or projected_utilization > 105:
            status_risk = "high"
        elif pending_utilization > 80 or projected_utilization > 90:
            status_risk = "medium"

        result.append({
            "budget_id": str(r["budget_id"]),
            "department_id": str(r["department_id"]),
            "department_name": r["department_name"],
            "department_desc": r["department_desc"],
            "fiscal_year": r["fiscal_year"],
            "total_budget": total,
            "spent_amount": spent,
            "pending_amount": pending,
            "remaining_amount": remaining,
            "utilization_pct": round(utilization, 1),
            "pending_utilization_pct": round(pending_utilization, 1),
            "monthly_run_rate": round(monthly_avg, 2),
            "projected_spend": round(projected_spend, 2),
            "projected_utilization_pct": round(projected_utilization, 1),
            "potential_overspend": round(potential_overspend, 2),
            "risk_level": status_risk,
            "total_expenses_count": r["total_expenses_count"]
        })
    return result

def get_budget_for_department(department_id: str, fiscal_year: int = 2026) -> Dict[str, Any]:
    all_budgets = get_department_budgets(fiscal_year)
    for b in all_budgets:
        if b["department_id"] == department_id:
            return b
    return None

def simulate_budget_impact(department_id: str, additional_amount: float, fiscal_year: int = 2026) -> Dict[str, Any]:
    dept_budget = get_budget_for_department(department_id, fiscal_year)
    if not dept_budget:
        return {
            "error": "Department budget not found",
            "department_id": department_id
        }

    total = dept_budget["total_budget"]
    curr_spent = dept_budget["spent_amount"]
    curr_util = dept_budget["utilization_pct"]
    curr_forecast_pct = dept_budget["projected_utilization_pct"]

    # After approval
    after_spent = curr_spent + additional_amount
    after_remaining = total - after_spent
    after_util = round((after_spent / total * 100), 1) if total > 0 else 0.0

    current_month = max(1, datetime.now().month)
    after_monthly_avg = after_spent / current_month
    after_forecast_spend = after_monthly_avg * 12
    after_forecast_pct = round((after_forecast_spend / total * 100), 1) if total > 0 else 0.0

    risk_before = dept_budget["risk_level"]
    risk_after = "low"
    if after_util > 90 or after_forecast_pct > 100:
        risk_after = "high"
    elif after_util > 75 or after_forecast_pct > 85:
        risk_after = "medium"

    return {
        "department_name": dept_budget["department_name"],
        "total_budget": total,
        "additional_amount": additional_amount,
        "current_spent": curr_spent,
        "after_spent": after_spent,
        "current_utilization": curr_util,
        "after_utilization": after_util,
        "current_forecast_pct": curr_forecast_pct,
        "after_forecast_pct": after_forecast_pct,
        "risk_before": risk_before,
        "risk_after": risk_after,
        "impact_classification": "High Impact" if additional_amount >= 25000 else ("Medium Impact" if additional_amount >= 5000 else "Routine")
    }
