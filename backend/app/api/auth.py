import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from jose import jwt

from app.database import get_db
from app.models.staff import Staff
from app.models.restriction import AccessRestriction
from app.config import settings
from app.security import hash_password, verify_password, encrypt_password_for_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str
    pincode: Optional[str] = None

class LoginResponse(BaseModel):
    token: str
    user: dict

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    clean_email = req.email.strip().lower()

    # ── Super Admin bypass (works even if DB is empty) ──────────────────
    if (clean_email == settings.SUPER_ADMIN_EMAIL.strip().lower() and
            req.password.strip() == settings.SUPER_ADMIN_PASSWORD.strip()):
        access_token = create_access_token(
            data={"sub": "super-admin", "role": "Admin", "email": clean_email}
        )
        return {
            "token": access_token,
            "user": {
                "id": "super-admin",
                "name": "Super Admin",
                "email": clean_email,
                "role": "Admin",
                "status": "Active",
                "permissions": None
            }
        }
    # ────────────────────────────────────────────────────────────────────

    result = await db.execute(select(Staff).where(func.lower(func.trim(Staff.email)) == clean_email))
    matches = result.scalars().all()
    if len(matches) > 1:
        logging.getLogger(__name__).warning("Duplicate staff rows detected for email '%s' (%d matches)", clean_email, len(matches))
        active_matches = [m for m in matches if not (m.status and m.status.lower() == "inactive")]
        staff_member = active_matches[0] if active_matches else matches[0]
    else:
        staff_member = matches[0] if matches else None

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

    # Validate password strictly (blank/NULL stored passwords cannot log in)
    is_valid, needs_rehash = verify_password(req.password, staff_member.password)
    if not is_valid:
        if not staff_member.password or not staff_member.password.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account has no password configured. Please contact an administrator."
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if needs_rehash:
        staff_member.password = hash_password(req.password)
        staff_member.encrypted_password = encrypt_password_for_admin(req.password)
        await db.commit()

    # Access Restrictions enforcement for non-admin users
    user_role = (staff_member.role or "Employee").lower()
    if user_role != "admin":
        res_result = await db.execute(select(AccessRestriction).where(AccessRestriction.id == "default"))
        restriction = res_result.scalar_one_or_none()
        
        if restriction:
            # 1. IP Allowlist Check
            if restriction.ip_whitelist and len(restriction.ip_whitelist) > 0:
                client_ip = request.client.host if request.client else "127.0.0.1"
                if client_ip not in restriction.ip_whitelist and client_ip not in ["127.0.0.1", "localhost", "::1"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access Denied: Your IP address ({client_ip}) is not authorized by system security policy."
                    )
            
            # 2. Time Window Check
            if restriction.enable_time_restrictions and restriction.start_time and restriction.end_time:
                now_str = datetime.now().strftime("%H:%M")
                if not (restriction.start_time <= now_str <= restriction.end_time):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access Denied: Login is restricted outside allowed server hours ({restriction.start_time} to {restriction.end_time})."
                    )

            # 3. Geo Pincode Check
            if restriction.enable_geo_restrictions and restriction.allowed_pincodes and len(restriction.allowed_pincodes) > 0:
                allowed_codes = [p["code"] if isinstance(p, dict) else str(p) for p in restriction.allowed_pincodes]
                if req.pincode and req.pincode.strip() not in allowed_codes:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access Denied: Login from PIN code ({req.pincode}) is not authorized."
                    )
        
    access_token = create_access_token(
        data={"sub": str(staff_member.id), "role": staff_member.role or "Employee", "email": staff_member.email}
    )

    return {
        "token": access_token,
        "user": {
            "id": staff_member.id,
            "name": staff_member.name,
            "email": staff_member.email,
            "role": staff_member.role or "Employee",
            "status": staff_member.status,
            "permissions": staff_member.permissions,
            "officeStartTime": staff_member.office_start_time,
            "office_start_time": staff_member.office_start_time,
            "officeEndTime": staff_member.office_end_time,
            "office_end_time": staff_member.office_end_time
        }
    }
