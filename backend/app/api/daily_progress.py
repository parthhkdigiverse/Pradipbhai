from datetime import datetime
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.daily_progress import DailyProgress
from app.schemas.daily_progress import DailyProgressCreate, DailyProgressUpdate, DailyProgressOut

from app.cache import get_cache, set_cache, invalidate_cache

router = APIRouter(prefix="/daily-progress", tags=["Daily Progress"])
CACHE_KEY_DP = "cache:daily_progress:all"

@router.get("", response_model=List[DailyProgressOut])
async def get_daily_progress_records(db: AsyncSession = Depends(get_db)):
    cached = await get_cache(CACHE_KEY_DP)
    if cached is not None:
        return cached

    result = await db.execute(select(DailyProgress))
    records = result.scalars().all()
    records_dict = [DailyProgressOut.model_validate(r).model_dump() for r in records]
    await set_cache(CACHE_KEY_DP, records_dict, expire_seconds=120)
    return records

@router.post("", response_model=DailyProgressOut, status_code=status.HTTP_201_CREATED)
async def create_daily_progress(progress_in: DailyProgressCreate, db: AsyncSession = Depends(get_db)):
    progress_id = progress_in.id or f"prog-{uuid.uuid4().hex[:8]}"
    progress = DailyProgress(
        id=progress_id,
        employee_name=progress_in.employee_name,
        role=progress_in.role,
        date=progress_in.date,
        submitted_at=progress_in.submitted_at or datetime.now().strftime("%H:%M"),
        tasks_done=progress_in.tasks_done or [],
        tasks_pending=progress_in.tasks_pending or [],
        hours_logged=progress_in.hours_logged or 0.0,
        verification_status=progress_in.verification_status or "Pending",
        rating=progress_in.rating or 0,
        manager_remarks=progress_in.manager_remarks,
        verified_by=progress_in.verified_by
    )
    db.add(progress)
    await db.commit()
    await db.refresh(progress)
    await invalidate_cache("cache:daily_progress")
    return progress

@router.put("/{progress_id}", response_model=DailyProgressOut)
async def update_daily_progress(progress_id: str, progress_in: DailyProgressUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DailyProgress).where(DailyProgress.id == progress_id))
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail="Daily progress record not found")
    
    for field, val in progress_in.model_dump(exclude_unset=True).items():
        setattr(progress, field, val)
        
    await db.commit()
    await db.refresh(progress)
    await invalidate_cache("cache:daily_progress")
    return progress

@router.delete("/{progress_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_progress(progress_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DailyProgress).where(DailyProgress.id == progress_id))
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail="Daily progress record not found")
    await db.delete(progress)
    await db.commit()
    await invalidate_cache("cache:daily_progress")
