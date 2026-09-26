from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.auth import get_current_user, require_role
from app.services.approval_service import act_on_approval, get_approval_aging_metrics

router = APIRouter(prefix="/api/approvals", tags=["approvals"])

class ApprovalAction(BaseModel):
    action: str # 'approve', 'reject', 'escalate'
    comment: Optional[str] = None

@router.get("")
def list_approvals(current_user: dict = Depends(require_role("manager", "finance", "admin"))):
    role = current_user["role"]
    user_id = current_user["id"]
    dept_id = current_user.get("department_id")

    query = """
        SELECT a.id as approval_id, a.approval_order, a.status as approval_status, a.created_at as queued_at,
               e.id as expense_id, e.merchant, e.amount, e.currency, e.category, e.expense_date,
               e.description, e.invoice_number, e.receipt_path, e.status as expense_status,
               e.policy_status, e.risk_level, e.ai_recommendation, e.ai_summary, e.ai_analysis,
               d.name as department_name, d.id as department_id,
               p.full_name as employee_name, p.employee_code,
               EXTRACT(DAY FROM (NOW() - a.created_at)) as age_days
        FROM public.expense_approvals a
        JOIN public.expenses e ON a.expense_id = e.id
        JOIN public.departments d ON e.department_id = d.id
        JOIN public.profiles p ON e.employee_id = p.id
        WHERE a.status = 'pending' AND e.status IN ('submitted', 'in_review')
    """
    params = []

    # If manager, show queue for their department or assigned
    if role == "manager":
        query += " AND (a.approver_id = %s OR e.department_id = %s)"
        params.extend([user_id, dept_id])
    elif role == "finance":
        # Finance stage approvals (order >= 2 or finance role rules)
        query += " AND a.approval_order >= 1"

    query += " ORDER BY e.amount DESC;"

    with get_db() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()

    items = [dict(r) for r in rows]

    # Group into High Impact, Policy Review, Routine
    high_impact = []
    policy_review = []
    routine = []

    for item in items:
        amt = float(item["amount"])
        pol = item["policy_status"]
        risk = item["risk_level"]

        if amt >= 25000:
            high_impact.append(item)
        elif pol == "violation" or risk == "high":
            policy_review.append(item)
        else:
            routine.append(item)

    aging = get_approval_aging_metrics()

    return {
        "total_count": len(items),
        "high_impact": high_impact,
        "policy_review": policy_review,
        "routine": routine,
        "aging_metrics": aging
    }

@router.post("/{approval_id}/act")
def take_approval_action(
    approval_id: str,
    req: ApprovalAction,
    current_user: dict = Depends(require_role("manager", "finance", "admin"))
):
    if req.action not in ["approve", "reject", "escalate"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve', 'reject', or 'escalate'")

    try:
        res = act_on_approval(
            approval_id=approval_id,
            user_id=current_user["id"],
            action=req.action,
            comment=req.comment
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
