from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(req: LoginRequest):
    with get_db() as cur:
        cur.execute("""
            SELECT u.id, u.email, u.encrypted_password, p.full_name, p.employee_code, p.role, 
                   p.department_id, d.name as department_name
            FROM auth.users u
            JOIN public.profiles p ON u.id = p.id
            LEFT JOIN public.departments d ON p.department_id = d.id
            WHERE LOWER(u.email) = LOWER(%s);
        """, (req.email,))
        user = cur.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(req.password, user["encrypted_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    user_dict = {
        "id": str(user["id"]),
        "email": user["email"],
        "full_name": user["full_name"],
        "employee_code": user["employee_code"],
        "role": user["role"],
        "department_id": str(user["department_id"]) if user["department_id"] else None,
        "department_name": user["department_name"]
    }

    token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_dict
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}

@router.get("/demo-users")
def get_demo_users():
    return {
        "demo_users": [
            {"role": "employee", "label": "Employee (Rahul Sharma)", "email": "employee@company.com", "password": "employee123", "department": "Engineering"},
            {"role": "manager", "label": "Manager (Priya Nair)", "email": "manager@company.com", "password": "manager123", "department": "Engineering"},
            {"role": "finance", "label": "Finance Officer (Amit Verma)", "email": "finance@company.com", "password": "finance123", "department": "Finance"},
            {"role": "admin", "label": "System Admin (Sneha Patel)", "email": "admin@company.com", "password": "admin123", "department": "Operations"}
        ]
    }
