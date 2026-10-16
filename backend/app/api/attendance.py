import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.attendance import Attendance
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceOut

from app.cache import get_cache, set_cache, invalidate_cache
from app.api.deps import get_current_user
from app.models.staff import Staff

router = APIRouter(prefix="/attendance", tags=["Attendance"])
CACHE_KEY_ATT = "cache:attendance"

@router.get("", response_model=List[AttendanceOut])
async def get_attendance_records(
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(get_current_user)
):
    user_role = (current_user.role or "Employee").lower()
    cache_id = f"{CACHE_KEY_ATT}:{user_role}:{current_user.id}"
    cached = await get_cache(cache_id)
    if cached is not None:
        return cached

    if user_role in ["admin", "manager"]:
        result = await db.execute(select(Attendance))
    else:
        result = await db.execute(
            select(Attendance).where(
                (Attendance.staff_id == current_user.id) | (Attendance.staff_name == current_user.name)
            )
        )
    records = result.scalars().all()
    records_dict = [AttendanceOut.model_validate(r).model_dump() for r in records]
    await set_cache(cache_id, records_dict, expire_seconds=60)
    return records

@router.post("", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
async def create_attendance(att_in: AttendanceCreate, db: AsyncSession = Depends(get_db)):
    att_id = att_in.id or f"att-{uuid.uuid4().hex[:8]}"
    att = Attendance(
        id=att_id,
        staff_id=att_in.staff_id,
        staff_name=att_in.staff_name,
        date=att_in.date,
        check_in=att_in.check_in,
        check_out=att_in.check_out,
        work_hours=att_in.work_hours or 0.0,
        overtime_hours=att_in.overtime_hours or 0.0,
        status=att_in.status or "Present",
        location=att_in.location,
        punches=att_in.punches,
        is_late=att_in.is_late or False,
        late_minutes=att_in.late_minutes or 0,
        penalty_amount=att_in.penalty_amount or 0.0,
        warning_note=att_in.warning_note
    )
    db.add(att)
    await db.commit()
    await db.refresh(att)
    await invalidate_cache(CACHE_KEY_ATT)
    return att

@router.put("/{att_id}", response_model=AttendanceOut)
async def update_attendance(att_id: str, att_in: AttendanceUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Attendance).where(Attendance.id == att_id))
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    for field, val in att_in.model_dump(exclude_unset=True).items():
        setattr(att, field, val)
        
    await db.commit()
    await db.refresh(att)
    await invalidate_cache(CACHE_KEY_ATT)
    return att

@router.delete("/{att_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(att_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Attendance).where(Attendance.id == att_id))
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    await db.delete(att)
    await db.commit()
    await invalidate_cache(CACHE_KEY_ATT)
