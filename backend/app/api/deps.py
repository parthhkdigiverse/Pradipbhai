from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.config import settings
from app.models.staff import Staff

security = HTTPBearer(auto_error=False)

# Synthetic super admin object (no DB row needed)
class SuperAdminUser:
    id = "super-admin"
    name = "Super Admin"
    email = settings.SUPER_ADMIN_EMAIL
    role = "Admin"
    status = "Active"
    permissions = None
    phone = None
    join_date = None
    base_salary = None
    password = None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Staff:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials or not credentials.credentials:
        raise credentials_exception

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # ── Super Admin bypass: no DB lookup needed ──────────────────────────
    if user_id == "super-admin":
        return SuperAdminUser()
    # ─────────────────────────────────────────────────────────────────────

    result = await db.execute(select(Staff).where(Staff.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    if user.status and user.status.lower() == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )

    return user
