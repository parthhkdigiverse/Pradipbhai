import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.field_duty import FieldDuty
from app.schemas.field_duty import FieldDutyCreate, FieldDutyOut, FieldDutyBase

router = APIRouter(prefix="/field-duties", tags=["FieldDuties"])

@router.get("", response_model=List[FieldDutyOut])
async def get_field_duties(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FieldDuty))
    return result.scalars().all()

@router.post("", response_model=FieldDutyOut)
async def create_field_duty(duty: FieldDutyCreate, db: AsyncSession = Depends(get_db)):
    duty_id = duty.id or f"fd-{uuid.uuid4().hex[:8]}"
    db_duty = FieldDuty(id=duty_id, name=duty.name, auto_logout=duty.auto_logout)
    db.add(db_duty)
    await db.commit()
    await db.refresh(db_duty)
    return db_duty

@router.put("/{duty_id}", response_model=FieldDutyOut)
async def update_field_duty(duty_id: str, duty: FieldDutyBase, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FieldDuty).where(FieldDuty.id == duty_id))
    db_duty = result.scalar_one_or_none()
    if not db_duty:
        raise HTTPException(status_code=404, detail="Not found")
    
    db_duty.name = duty.name
    if duty.auto_logout is not None:
        db_duty.auto_logout = duty.auto_logout
    await db.commit()
    await db.refresh(db_duty)
    return db_duty

@router.delete("/{duty_id}")
async def delete_field_duty(duty_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FieldDuty).where(FieldDuty.id == duty_id))
    db_duty = result.scalar_one_or_none()
    if db_duty:
        await db.delete(db_duty)
        await db.commit()
    return {"status": "ok"}
