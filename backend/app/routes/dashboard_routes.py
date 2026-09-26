from fastapi import APIRouter, Depends
from app.database import get_db
from app.auth import get_current_user
from app.services.budget_service import get_department_budgets
from app.services.approval_service import get_approval_aging_metrics

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("")
def get_dashboard_data(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    user_id = current_user["id"]
    dept_id = current_user.get("department_id")

    with get_db() as cur:
        if role == "employee":
            # Employee metrics
            cur.execute("""
                SELECT 
                    COALESCE(SUM(amount), 0) as total_spend,
                    COUNT(CASE WHEN status IN ('submitted', 'in_review') THEN 1 END) as pending_count,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                    COALESCE(SUM(CASE WHEN status = 'reimbursed' THEN amount ELSE 0 END), 0) as reimbursed_amount
                FROM public.expenses
                WHERE employee_id = %s;
            """, (user_id,))
            stat = cur.fetchone()

            # Recent expenses
            cur.execute("""
                SELECT id, merchant, amount, category, expense_date, status, policy_status, risk_level, ai_recommendation
                FROM public.expenses
                WHERE employee_id = %s
                ORDER BY created_at DESC
                LIMIT 6;
            """, (user_id,))
            recent = cur.fetchall()

            # Category distribution
            cur.execute("""
                SELECT category, COALESCE(SUM(amount), 0) as total
                FROM public.expenses
                WHERE employee_id = %s
                GROUP BY category
                ORDER BY total DESC;
            """, (user_id,))
            categories = cur.fetchall()

            return {
                "role": role,
                "summary": {
                    "total_spend": float(stat["total_spend"]),
                    "pending_count": stat["pending_count"],
                    "approved_count": stat["approved_count"],
                    "reimbursed_amount": float(stat["reimbursed_amount"])
                },
                "recent_expenses": [dict(r) for r in recent],
                "categories": [dict(c) for c in categories]
            }

        else:
            # Manager / Finance / Admin metrics
            cur.execute("""
                SELECT 
                    COALESCE(SUM(amount), 0) as total_spend,
                    COUNT(CASE WHEN status IN ('submitted', 'in_review') THEN 1 END) as pending_count,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                    COUNT(CASE WHEN risk_level = 'high' AND status IN ('submitted', 'in_review') THEN 1 END) as high_risk_count,
                    COALESCE(SUM(CASE WHEN status = 'reimbursed' THEN amount ELSE 0 END), 0) as reimbursed_amount
                FROM public.expenses;
            """)
            stat = cur.fetchone()

            # Pending approval queue preview
            cur.execute("""
                SELECT e.id, e.merchant, e.amount, e.category, e.expense_date, e.status, 
                       e.policy_status, e.risk_level, e.ai_recommendation, e.ai_summary,
                       d.name as department_name, p.full_name as employee_name,
                       a.id as approval_id, a.approval_order, a.status as approval_status,
                       EXTRACT(DAY FROM (NOW() - e.created_at)) as age_days
                FROM public.expense_approvals a
                JOIN public.expenses e ON a.expense_id = e.id
                JOIN public.profiles p ON e.employee_id = p.id
                JOIN public.departments d ON e.department_id = d.id
                WHERE a.status = 'pending' AND e.status IN ('submitted', 'in_review')
                ORDER BY e.amount DESC
                LIMIT 8;
            """)
            queue = cur.fetchall()

            # Category spending breakdown
            cur.execute("""
                SELECT category, COALESCE(SUM(amount), 0) as total
                FROM public.expenses
                GROUP BY category
                ORDER BY total DESC;
            """)
            categories = cur.fetchall()

            # Monthly trend
            cur.execute("""
                SELECT TO_CHAR(expense_date, 'Mon') as month, COALESCE(SUM(amount), 0) as total
                FROM public.expenses
                GROUP BY TO_CHAR(expense_date, 'Mon'), EXTRACT(MONTH FROM expense_date)
                ORDER BY EXTRACT(MONTH FROM expense_date);
            """)
            trend = cur.fetchall()

            # Department budgets
            budgets = get_department_budgets(2026)
            aging = get_approval_aging_metrics()

            return {
                "role": role,
                "summary": {
                    "total_spend": float(stat["total_spend"]),
                    "pending_count": stat["pending_count"],
                    "approved_count": stat["approved_count"],
                    "high_risk_count": stat["high_risk_count"],
                    "reimbursed_amount": float(stat["reimbursed_amount"])
                },
                "budgets": budgets,
                "pending_queue": [dict(q) for q in queue],
                "categories": [dict(c) for c in categories],
                "trend": [dict(t) for t in trend],
                "aging_metrics": aging
            }
