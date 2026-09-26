from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user
from app.services.budget_service import get_department_budgets, get_budget_for_department, simulate_budget_impact

router = APIRouter(prefix="/api/budgets", tags=["budgets"])

class SimulationRequest(BaseModel):
    department_id: str
    amount: float

@router.get("")
def list_budgets(fiscal_year: int = 2026, current_user: dict = Depends(get_current_user)):
    budgets = get_department_budgets(fiscal_year)
    total_org_budget = sum(b["total_budget"] for b in budgets)
    total_org_spent = sum(b["spent_amount"] for b in budgets)
    total_org_pending = sum(b["pending_amount"] for b in budgets)
    org_utilization = (total_org_spent / total_org_budget * 100) if total_org_budget > 0 else 0.0

    return {
        "fiscal_year": fiscal_year,
        "summary": {
            "total_org_budget": total_org_budget,
            "total_org_spent": total_org_spent,
            "total_org_pending": total_org_pending,
            "org_utilization_pct": round(org_utilization, 1)
        },
        "departments": budgets
    }

@router.get("/{department_id}")
def get_budget_detail(department_id: str, fiscal_year: int = 2026, current_user: dict = Depends(get_current_user)):
    b = get_budget_for_department(department_id, fiscal_year)
    if not b:
        raise HTTPException(status_code=404, detail="Department budget not found")
    return {"budget": b}

@router.post("/simulate")
def simulate(req: SimulationRequest, current_user: dict = Depends(get_current_user)):
    return simulate_budget_impact(req.department_id, req.amount)
