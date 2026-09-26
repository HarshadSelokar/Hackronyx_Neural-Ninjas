import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.database import get_db

def create_approvals_for_expense(expense_id: str, amount: float, department_id: str):
    """
    Dynamically creates expense_approvals rows based on approval_rules table.
    """
    with get_db() as cur:
        cur.execute("""
            SELECT * FROM public.approval_rules
            WHERE is_active = true
              AND min_amount <= %s
              AND (max_amount IS NULL OR max_amount >= %s)
            ORDER BY approval_order ASC;
        """, (amount, amount))
        rules = cur.fetchall()

        if not rules:
            # Fallback rule: manager at least
            rules = [{"required_role": "manager", "approval_order": 1}]

        # Find candidate approver profiles for required roles
        for r in rules:
            role = r["required_role"]
            order = r["approval_order"]
            
            # Find an active approver profile with this role
            # For manager: prefer same department if possible
            if role == "manager":
                cur.execute("""
                    SELECT id FROM public.profiles 
                    WHERE role = 'manager' AND (department_id = %s OR department_id IS NULL)
                    LIMIT 1;
                """, (department_id,))
            else:
                cur.execute("SELECT id FROM public.profiles WHERE role = %s LIMIT 1;", (role,))
            
            approver = cur.fetchone()
            if not approver:
                # Fallback to any admin or first profile
                cur.execute("SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1;")
                approver = cur.fetchone()

            if approver:
                cur.execute("""
                    INSERT INTO public.expense_approvals (
                        id, expense_id, approver_id, approval_order, status, created_at
                    ) VALUES (%s, %s, %s, %s, 'pending', NOW())
                    ON CONFLICT (expense_id, approval_order) DO NOTHING;
                """, (str(uuid.uuid4()), expense_id, approver["id"], order))

def act_on_approval(approval_id: str, user_id: str, action: str, comment: str = None) -> Dict[str, Any]:
    """
    action: 'approved' | 'rejected' | 'escalated'
    """
    with get_db() as cur:
        # Get approval and expense info
        cur.execute("""
            SELECT a.*, e.amount, e.status as expense_status, e.employee_id, e.department_id,
                   p.role as user_role
            FROM public.expense_approvals a
            JOIN public.expenses e ON a.expense_id = e.id
            JOIN public.profiles p ON p.id = %s
            WHERE a.id = %s;
        """, (user_id, approval_id))
        app = cur.fetchone()

        if not app:
            raise ValueError("Approval record not found")

        expense_id = str(app["expense_id"])
        current_order = app["approval_order"]

        # Update current approval status
        new_status = "approved" if action == "approve" else ("rejected" if action == "reject" else "pending")
        if action == "escalate":
            new_comment = f"Escalated by {app['user_role']}: {comment or 'Needs higher level scrutiny'}"
        else:
            new_comment = comment

        cur.execute("""
            UPDATE public.expense_approvals
            SET status = %s, comment = %s, acted_at = NOW()
            WHERE id = %s;
        """, (new_status, new_comment, approval_id))

        # Check remaining stages
        if action == "approve":
            # Check if there are higher order pending approvals for this expense
            cur.execute("""
                SELECT count(*) as cnt FROM public.expense_approvals
                WHERE expense_id = %s AND approval_order > %s AND status = 'pending';
            """, (expense_id, current_order))
            remaining = cur.fetchone()["cnt"]

            if remaining == 0:
                # All stages approved!
                cur.execute("""
                    UPDATE public.expenses 
                    SET status = 'approved', updated_at = NOW()
                    WHERE id = %s;
                """, (expense_id,))
                expense_new_status = "approved"
            else:
                cur.execute("""
                    UPDATE public.expenses 
                    SET status = 'in_review', updated_at = NOW()
                    WHERE id = %s;
                """, (expense_id,))
                expense_new_status = "in_review"

        elif action == "reject":
            # Reject expense completely and mark other pending stages skipped
            cur.execute("""
                UPDATE public.expenses 
                SET status = 'rejected', updated_at = NOW()
                WHERE id = %s;
            """, (expense_id,))
            cur.execute("""
                UPDATE public.expense_approvals 
                SET status = 'skipped' 
                WHERE expense_id = %s AND status = 'pending' AND id != %s;
            """, (expense_id, approval_id))
            expense_new_status = "rejected"

        else: # escalate
            expense_new_status = "in_review"

        # Record in audit_logs
        cur.execute("""
            INSERT INTO public.audit_logs (id, user_id, expense_id, action, old_value, new_value, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW());
        """, (
            str(uuid.uuid4()),
            user_id,
            expense_id,
            f"expense_{action}d",
            json.dumps({"approval_id": approval_id, "previous_status": app["status"]}),
            json.dumps({"action": action, "comment": new_comment, "expense_status": expense_new_status})
        ))

    return {
        "success": True,
        "expense_id": expense_id,
        "approval_id": approval_id,
        "action": action,
        "expense_status": expense_new_status
    }

def get_approval_aging_metrics() -> Dict[str, Any]:
    with get_db() as cur:
        # Average days by role
        cur.execute("""
            SELECT p.role, 
                   AVG(EXTRACT(EPOCH FROM (COALESCE(a.acted_at, NOW()) - a.created_at)) / 86400) as avg_days
            FROM public.expense_approvals a
            JOIN public.profiles p ON a.approver_id = p.id
            GROUP BY p.role;
        """)
        rows = cur.fetchall()
        
        aging_by_role = {"manager": 0.0, "finance": 0.0, "admin": 0.0}
        for r in rows:
            if r["role"] in aging_by_role and r["avg_days"] is not None:
                aging_by_role[r["role"]] = round(float(r["avg_days"]), 1)

    return aging_by_role
