from typing import Iterable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.config import settings
from app.models.staff import Staff
from app.models.permission import RolePermission

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

async def resolve_user_from_token(token: str, db: AsyncSession) -> Staff:
    """Decode a JWT string and return the active Staff (or SuperAdminUser), or raise HTTPException."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    clean_token = (token or "").strip()
    if not clean_token:
        raise credentials_exception

    try:
        payload = jwt.decode(clean_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    if user_id == "super-admin":
        return SuperAdminUser()

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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Staff:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await resolve_user_from_token(credentials.credentials, db)


def is_admin_user(user: Staff) -> bool:
    return (getattr(user, "role", "") or "").strip().lower() == "admin"


def is_admin_or_manager(user: Staff) -> bool:
    return (getattr(user, "role", "") or "").strip().lower() in ("admin", "manager")


async def check_user_permission(user: Staff, action: str, db: AsyncSession) -> bool:
    """Resolve permission matching frontend priority: individual Staff override -> RolePermission DB -> DEFAULT_PERMISSIONS."""
    if is_admin_user(user):
        perms = getattr(user, "permissions", None)
        if isinstance(perms, dict) and action in perms and perms[action] is not None:
            return bool(perms[action])
        return True

    perms = getattr(user, "permissions", None)
    if isinstance(perms, dict) and action in perms and perms[action] is not None:
        return bool(perms[action])

    role = (getattr(user, "role", "") or "Employee").strip() or "Employee"
    perm_id = f"perm-{role}-{action.replace(' ', '-').replace('/', '-')}"
    res = await db.execute(select(RolePermission).where(RolePermission.id == perm_id))
    rec = res.scalars().first()
    if rec is not None:
        return bool(rec.allowed)

    from app.api.permissions import DEFAULT_PERMISSIONS
    role_defaults = DEFAULT_PERMISSIONS.get(role, DEFAULT_PERMISSIONS.get("Employee", {}))
    if action in role_defaults:
        return bool(role_defaults[action])
    return False


async def check_any_permission(user: Staff, actions: Iterable[str], db: AsyncSession) -> bool:
    for act in actions:
        if await check_user_permission(user, act, db):
            return True
    return False


def require_permission(*actions: str):
    """FastAPI dependency requiring the current user to hold at least one of the specified permissions."""
    async def _guard(
        current_user: Staff = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> Staff:
        if not await check_any_permission(current_user, actions, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires {' or '.join(actions)}",
            )
        return current_user
    return _guard


def require_admin():
    async def _guard(current_user: Staff = Depends(get_current_user)) -> Staff:
        if not is_admin_user(current_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        return current_user
    return _guard
