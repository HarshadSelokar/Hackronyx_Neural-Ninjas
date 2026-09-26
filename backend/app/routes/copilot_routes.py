from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.auth import get_current_user
from app.services.copilot_service import query_finance_copilot

router = APIRouter(prefix="/api/copilot", tags=["copilot"])

class CopilotQuery(BaseModel):
    query: str

@router.post("/query")
def copilot_query(req: CopilotQuery, current_user: dict = Depends(get_current_user)):
    res = query_finance_copilot(req.query)
    return res
