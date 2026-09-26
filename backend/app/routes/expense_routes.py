import uuid
import json
import os
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from app.database import get_db
from app.auth import get_current_user
from app.services.ai_service import extract_receipt_data, generate_ai_analysis
from app.services.approval_service import create_approvals_for_expense
from app.services.budget_service import simulate_budget_impact

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

class ExpenseCreate(BaseModel):
    amount: float
    category: str
    merchant: str
    expense_date: str
    description: Optional[str] = None
    invoice_number: Optional[str] = None
    receipt_path: Optional[str] = None
    department_id: Optional[str] = None

@router.get("")
def list_expenses(
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    role = current_user["role"]
    user_id = current_user["id"]

    query = """
        SELECT e.*, d.name as department_name, p.full_name as employee_name, p.employee_code
        FROM public.expenses e
        JOIN public.departments d ON e.department_id = d.id
        JOIN public.profiles p ON e.employee_id = p.id
        WHERE 1=1
    """
    params = []

    # If employee, only show own expenses
    if role == "employee":
        query += " AND e.employee_id = %s"
        params.append(user_id)
    elif role == "manager" and current_user.get("department_id"):
        # Manager can view their department's expenses
        query += " AND (e.department_id = %s OR e.employee_id = %s)"
        params.extend([current_user["department_id"], user_id])

    if category:
        query += " AND LOWER(e.category) = LOWER(%s)"
        params.append(category)

    if status_filter:
        query += " AND e.status = %s"
        params.append(status_filter)

    if risk_level:
        query += " AND e.risk_level = %s"
        params.append(risk_level)

    if search:
        query += " AND (LOWER(e.merchant) LIKE %s OR LOWER(e.description) LIKE %s OR LOWER(e.invoice_number) LIKE %s)"
        s = f"%{search.lower()}%"
        params.extend([s, s, s])

    query += " ORDER BY e.created_at DESC;"

    with get_db() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()

    return {"expenses": [dict(r) for r in rows]}

@router.get("/{expense_id}")
def get_expense_detail(expense_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as cur:
        cur.execute("""
            SELECT e.*, d.name as department_name, p.full_name as employee_name, p.employee_code, p.role as employee_role
            FROM public.expenses e
            JOIN public.departments d ON e.department_id = d.id
            JOIN public.profiles p ON e.employee_id = p.id
            WHERE e.id = %s;
        """, (expense_id,))
        exp = cur.fetchone()

        if not exp:
            raise HTTPException(status_code=404, detail="Expense not found")

        # Approvals timeline
        cur.execute("""
            SELECT a.*, p.full_name as approver_name, p.role as approver_role
            FROM public.expense_approvals a
            JOIN public.profiles p ON a.approver_id = p.id
            WHERE a.expense_id = %s
            ORDER BY a.approval_order ASC;
        """, (expense_id,))
        approvals = cur.fetchall()

        # Audit logs
        cur.execute("""
            SELECT l.*, p.full_name as actor_name
            FROM public.audit_logs l
            LEFT JOIN public.profiles p ON l.user_id = p.id
            WHERE l.expense_id = %s
            ORDER BY l.created_at ASC;
        """, (expense_id,))
        logs = cur.fetchall()

    return {
        "expense": dict(exp),
        "approvals": [dict(a) for a in approvals],
        "audit_logs": [dict(l) for l in logs]
    }

@router.post("")
def create_expense(req: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    employee_id = current_user["id"]
    dept_id = req.department_id or current_user.get("department_id")

    if not dept_id:
        with get_db() as cur:
            cur.execute("SELECT id FROM public.departments LIMIT 1;")
            dept_id = str(cur.fetchone()["id"])

    has_receipt = bool(req.receipt_path)

    # Run AI Analysis
    ai_result = generate_ai_analysis(
        employee_id=employee_id,
        department_id=dept_id,
        category=req.category,
        amount=req.amount,
        merchant=req.merchant,
        expense_date=req.expense_date,
        invoice_number=req.invoice_number,
        has_receipt=has_receipt
    )

    exp_id = str(uuid.uuid4())

    with get_db() as cur:
        cur.execute("""
            INSERT INTO public.expenses (
                id, employee_id, department_id, amount, currency, category, merchant,
                expense_date, description, invoice_number, receipt_path, status,
                policy_status, risk_level, ai_recommendation, ai_summary, ai_analysis,
                submitted_at, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, 'INR', %s, %s, %s, %s, %s, %s, 'submitted',
                %s, %s, %s, %s, %s, NOW(), NOW(), NOW()
            ) RETURNING *;
        """, (
            exp_id, employee_id, dept_id, req.amount, req.category, req.merchant,
            req.expense_date, req.description, req.invoice_number, req.receipt_path,
            ai_result["policy_status"], ai_result["risk_level"], ai_result["ai_recommendation"],
            ai_result["ai_summary"], json.dumps(ai_result["ai_analysis"])
        ))
        created = cur.fetchone()

        # Audit log for submission
        cur.execute("""
            INSERT INTO public.audit_logs (id, user_id, expense_id, action, new_value, created_at)
            VALUES (%s, %s, %s, 'expense_submitted', %s, NOW());
        """, (str(uuid.uuid4()), employee_id, exp_id, json.dumps({
            "amount": req.amount,
            "category": req.category,
            "merchant": req.merchant,
            "policy_status": ai_result["policy_status"],
            "risk_level": ai_result["risk_level"]
        })))

    # Dynamically generate approval stages based on approval_rules table
    create_approvals_for_expense(exp_id, req.amount, dept_id)

    return {
        "success": True,
        "expense": dict(created),
        "ai_analysis": ai_result
    }

@router.post("/extract-receipt")
async def extract_receipt(file: UploadFile = File(...)):
    contents = await file.read()
    extracted = extract_receipt_data(file.filename, contents)
    
    # Generate receipt storage path
    temp_id = str(uuid.uuid4())
    stored_path = f"uploads/{temp_id}/{file.filename}"
    extracted["receipt_path"] = stored_path
    extracted["filename"] = file.filename
    return extracted

@router.post("/{expense_id}/simulate")
def simulate_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    with get_db() as cur:
        cur.execute("SELECT department_id, amount FROM public.expenses WHERE id = %s;", (expense_id,))
        exp = cur.fetchone()
        if not exp:
            raise HTTPException(status_code=404, detail="Expense not found")

    simulation = simulate_budget_impact(str(exp["department_id"]), float(exp["amount"]))
    return simulation
