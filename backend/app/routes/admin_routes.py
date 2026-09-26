import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.database import get_db
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Pydantic schemas
class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None

class BudgetCreate(BaseModel):
    department_id: str
    fiscal_year: int
    total_amount: float

class PolicyCreate(BaseModel):
    category: str
    max_amount_per_transaction: Optional[float] = None
    max_amount_per_day: Optional[float] = None
    receipt_required: bool = True
    description: Optional[str] = None
    is_active: bool = True

class ApprovalRuleCreate(BaseModel):
    min_amount: float
    max_amount: Optional[float] = None
    required_role: str
    approval_order: int
    is_active: bool = True

# --- DEPARTMENTS ---
@router.get("/departments")
def list_departments(current_user: dict = Depends(get_current_user)):
    with get_db() as cur:
        cur.execute("SELECT * FROM public.departments ORDER BY name;")
        return {"departments": [dict(r) for r in cur.fetchall()]}

@router.post("/departments")
def create_department(req: DepartmentCreate, current_user: dict = Depends(require_role("admin"))):
    dept_id = str(uuid.uuid4())
    with get_db() as cur:
        cur.execute("""
            INSERT INTO public.departments (id, name, description)
            VALUES (%s, %s, %s) RETURNING *;
        """, (dept_id, req.name, req.description))
        return {"department": dict(cur.fetchone())}

# --- BUDGETS ---
@router.post("/budgets")
def create_or_update_budget(req: BudgetCreate, current_user: dict = Depends(require_role("admin"))):
    with get_db() as cur:
        cur.execute("""
            INSERT INTO public.budgets (id, department_id, fiscal_year, total_amount, created_by)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (department_id, fiscal_year) 
            DO UPDATE SET total_amount = EXCLUDED.total_amount, updated_at = NOW()
            RETURNING *;
        """, (str(uuid.uuid4()), req.department_id, req.fiscal_year, req.total_amount, current_user["id"]))
        return {"budget": dict(cur.fetchone())}

# --- POLICIES ---
@router.get("/policies")
def list_policies(current_user: dict = Depends(get_current_user)):
    with get_db() as cur:
        cur.execute("SELECT * FROM public.expense_policies ORDER BY category;")
        return {"policies": [dict(r) for r in cur.fetchall()]}

@router.post("/policies")
def create_policy(req: PolicyCreate, current_user: dict = Depends(require_role("admin"))):
    with get_db() as cur:
        cur.execute("""
            INSERT INTO public.expense_policies (
                id, category, max_amount_per_transaction, max_amount_per_day,
                receipt_required, description, is_active, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *;
        """, (
            str(uuid.uuid4()), req.category, req.max_amount_per_transaction,
            req.max_amount_per_day, req.receipt_required, req.description,
            req.is_active, current_user["id"]
        ))
        return {"policy": dict(cur.fetchone())}

# --- APPROVAL RULES ---
@router.get("/approval-rules")
def list_approval_rules(current_user: dict = Depends(get_current_user)):
    with get_db() as cur:
        cur.execute("SELECT * FROM public.approval_rules ORDER BY min_amount ASC, approval_order ASC;")
        return {"approval_rules": [dict(r) for r in cur.fetchall()]}

@router.post("/approval-rules")
def create_approval_rule(req: ApprovalRuleCreate, current_user: dict = Depends(require_role("admin"))):
    with get_db() as cur:
        cur.execute("""
            INSERT INTO public.approval_rules (
                id, min_amount, max_amount, required_role, approval_order, is_active, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *;
        """, (
            str(uuid.uuid4()), req.min_amount, req.max_amount,
            req.required_role, req.approval_order, req.is_active, current_user["id"]
        ))
        return {"approval_rule": dict(cur.fetchone())}

# --- AUDIT LOGS ---
@router.get("/audit-logs")
def list_audit_logs(limit: int = 50, current_user: dict = Depends(require_role("admin", "finance"))):
    with get_db() as cur:
        cur.execute("""
            SELECT l.*, p.full_name as user_name, p.role as user_role, e.merchant, e.amount
            FROM public.audit_logs l
            LEFT JOIN public.profiles p ON l.user_id = p.id
            LEFT JOIN public.expenses e ON l.expense_id = e.id
            ORDER BY l.created_at DESC
            LIMIT %s;
        """, (limit,))
        return {"audit_logs": [dict(r) for r in cur.fetchall()]}
