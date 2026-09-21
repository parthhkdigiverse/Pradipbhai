import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.attendance import Attendance
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceOut

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.get("", response_model=List[AttendanceOut])
async def get_attendance_records(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Attendance))
    return result.scalars().all()

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
        location=att_in.location
    )
    db.add(att)
    await db.commit()
    await db.refresh(att)
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
    return att

@router.delete("/{att_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(att_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Attendance).where(Attendance.id == att_id))
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    await db.delete(att)
    await db.commit()
