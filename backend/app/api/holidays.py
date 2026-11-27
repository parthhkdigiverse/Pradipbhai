import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.holiday import Holiday
from app.models.staff import Staff
from app.schemas.holiday import HolidayCreate, HolidayOut
from app.api.deps import require_permission

router = APIRouter(prefix="/holidays", tags=["Holidays"])

@router.get("", response_model=List[HolidayOut])
async def get_holidays(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Holiday))
    return result.scalars().all()

@router.post("", response_model=HolidayOut, status_code=status.HTTP_201_CREATED)
async def create_holiday(
    hol_in: HolidayCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("Manage Holidays")),
):
    hol_id = hol_in.id or f"hol-{uuid.uuid4().hex[:8]}"
    hol = Holiday(
        id=hol_id,
        date=hol_in.date,
        name=hol_in.name,
        type=hol_in.type or "National"
    )
    db.add(hol)
    await db.commit()
    await db.refresh(hol)
    return hol

@router.delete("/{hol_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holiday(
    hol_id: str,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("Manage Holidays")),
):
    result = await db.execute(select(Holiday).where(Holiday.id == hol_id))
    hol = result.scalar_one_or_none()
    if not hol:
        raise HTTPException(status_code=404, detail="Holiday not found")
    await db.delete(hol)
    await db.commit()
