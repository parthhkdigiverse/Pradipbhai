import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffUpdate, StaffOut
from app.cache import invalidate_cache
from app.security import hash_password, encrypt_password_for_admin, decrypt_password_for_admin, PBKDF2_PREFIX
from app.api.deps import get_current_user

router = APIRouter(prefix="/staff", tags=["Staff"])
CACHE_KEY = "cache:staff:all"

def _serialize_staff(s: Staff) -> dict:
    has_pw = bool(s.password and s.password.strip())
    has_encrypted = bool(getattr(s, "encrypted_password", None) and str(s.encrypted_password).strip())
    is_legacy_plain = has_pw and not str(s.password).strip().startswith(PBKDF2_PREFIX)
    return {
        "id": s.id,
        "name": s.name,
        "role": s.role,
        "email": s.email,
        "phone": s.phone,
        "status": s.status,
        "joinDate": s.join_date,
        "baseSalary": s.base_salary,
        "hasPassword": has_pw,
        "canRevealPassword": has_encrypted or is_legacy_plain,
        "permissions": s.permissions,
        "officeStartTime": s.office_start_time,
        "office_start_time": s.office_start_time,
        "officeEndTime": s.office_end_time,
        "office_end_time": s.office_end_time
    }

@router.get("", response_model=List[StaffOut])
async def get_staff(skip: int = 0, limit: int = 1000, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Staff).offset(skip).limit(limit))
    staff_members = result.scalars().all()
    return [_serialize_staff(s) for s in staff_members]

@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
async def create_staff(staff_in: StaffCreate, db: AsyncSession = Depends(get_db)):
    staff_id = staff_in.id or f"emp-{uuid.uuid4().hex[:8]}"
    start_time_val = staff_in.officeStartTime or staff_in.office_start_time
    end_time_val = staff_in.officeEndTime or staff_in.office_end_time
    raw_password = (staff_in.password or "").strip()
    if not raw_password:
        raise HTTPException(status_code=400, detail="Password is required when creating a staff account")
    staff_member = Staff(
        id=staff_id,
        name=staff_in.name,
        role=staff_in.role or "Employee",
        email=staff_in.email,
        phone=staff_in.phone,
        status=staff_in.status or "Active",
        join_date=staff_in.joinDate,
        base_salary=staff_in.baseSalary or 0.0,
        password=hash_password(raw_password),
        encrypted_password=encrypt_password_for_admin(raw_password),
        permissions=staff_in.permissions,
        office_start_time=start_time_val,
        office_end_time=end_time_val
    )
    db.add(staff_member)
    await db.commit()
    await db.refresh(staff_member)
    
    await invalidate_cache(CACHE_KEY)
    
    return _serialize_staff(staff_member)

@router.put("/{staff_id}", response_model=StaffOut)
async def update_staff(staff_id: str, staff_in: StaffUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff_member = result.scalar_one_or_none()
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    update_data = staff_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        new_pw = (update_data.pop("password") or "").strip()
        if new_pw:
            staff_member.password = hash_password(new_pw)
            staff_member.encrypted_password = encrypt_password_for_admin(new_pw)
    if "joinDate" in update_data:
        staff_member.join_date = update_data.pop("joinDate")
    if "baseSalary" in update_data:
        staff_member.base_salary = update_data.pop("baseSalary")
    if "officeStartTime" in update_data:
        staff_member.office_start_time = update_data.pop("officeStartTime")
    if "office_start_time" in update_data:
        staff_member.office_start_time = update_data.pop("office_start_time")
    if "officeEndTime" in update_data:
        staff_member.office_end_time = update_data.pop("officeEndTime")
    if "office_end_time" in update_data:
        staff_member.office_end_time = update_data.pop("office_end_time")
        
    for field, val in update_data.items():
        setattr(staff_member, field, val)
        
    await db.commit()
    await db.refresh(staff_member)
    await invalidate_cache(CACHE_KEY)
    
    return _serialize_staff(staff_member)

@router.get("/{staff_id}/reveal-password")
async def reveal_staff_password(
    staff_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(get_current_user)
):
    if (getattr(current_user, "role", "") or "").strip().lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admins can view staff passwords")

    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff_member = result.scalar_one_or_none()
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found")

    revealed = decrypt_password_for_admin(getattr(staff_member, "encrypted_password", None))
    if not revealed and staff_member.password and staff_member.password.strip():
        stored = staff_member.password.strip()
        if not stored.startswith(PBKDF2_PREFIX):
            revealed = stored

    return {
        "id": staff_member.id,
        "password": revealed,
        "canReveal": bool(revealed)
    }

@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(staff_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff_member = result.scalar_one_or_none()
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    await db.delete(staff_member)
    await db.commit()
    await invalidate_cache(CACHE_KEY)
