from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.staff import Staff

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    clean_email = req.email.strip().lower()
    
    result = await db.execute(select(Staff).where(Staff.email == clean_email))
    staff_member = result.scalar_one_or_none()
    
    # Only registered staff members in the DB can log in
    if not staff_member:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access Denied: Only registered staff members can log in."
        )
        
    if staff_member.status and staff_member.status.lower() == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact system administrator."
        )

    # Validate password if staff has a password configured
    if staff_member.password and staff_member.password.strip():
        if req.password.strip() != staff_member.password.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
        
    return {
        "token": f"jwt-token-{staff_member.id}",
        "user": {
            "id": staff_member.id,
            "name": staff_member.name,
            "email": staff_member.email,
            "role": staff_member.role or "Employee",
            "status": staff_member.status
        }
    }
