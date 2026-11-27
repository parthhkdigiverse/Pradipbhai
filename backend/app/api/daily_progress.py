from datetime import datetime
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.daily_progress import DailyProgress
from app.models.staff import Staff
from app.schemas.daily_progress import DailyProgressCreate, DailyProgressUpdate, DailyProgressOut

from app.cache import get_cache, set_cache, invalidate_cache
from app.api.deps import get_current_user, require_permission, check_any_permission, is_admin_user, is_admin_or_manager

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
async def create_daily_progress(
    progress_in: DailyProgressCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(get_current_user)
):
    can_verify = is_admin_or_manager(current_user) or await check_any_permission(current_user, ("Verify & Rate Reports",), db)
    progress_id = progress_in.id or f"prog-{uuid.uuid4().hex[:8]}"
    progress = DailyProgress(
        id=progress_id,
        employee_name=progress_in.employee_name if can_verify else current_user.name,
        role=progress_in.role if can_verify else (current_user.role or "Employee"),
        date=progress_in.date,
        submitted_at=progress_in.submitted_at or datetime.now().strftime("%H:%M"),
        tasks_done=progress_in.tasks_done or [],
        tasks_pending=progress_in.tasks_pending or [],
        hours_logged=progress_in.hours_logged or 0.0,
        verification_status=(progress_in.verification_status or "Pending") if can_verify else "Pending",
        rating=(progress_in.rating or 0) if can_verify else 0,
        manager_remarks=progress_in.manager_remarks if can_verify else None,
        verified_by=progress_in.verified_by if can_verify else None
    )
    db.add(progress)
    await db.commit()
    await db.refresh(progress)
    await invalidate_cache("cache:daily_progress")
    return progress

@router.put("/{progress_id}", response_model=DailyProgressOut)
async def update_daily_progress(
    progress_id: str,
    progress_in: DailyProgressUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(get_current_user)
):
    result = await db.execute(select(DailyProgress).where(DailyProgress.id == progress_id))
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail="Daily progress record not found")

    can_verify = is_admin_or_manager(current_user) or await check_any_permission(current_user, ("Verify & Rate Reports",), db)
    updates = progress_in.model_dump(exclude_unset=True)
    review_fields = {"verification_status", "rating", "manager_remarks", "verified_by"}
    touches_review = any(f in updates for f in review_fields)

    if touches_review:
        if not can_verify:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only users with Verify & Rate Reports can verify or rate reports")
        if (progress.employee_name or "").strip().lower() == (current_user.name or "").strip().lower() and not is_admin_user(current_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot verify or rate your own report")
    elif not can_verify and (progress.employee_name or "").strip().lower() != (current_user.name or "").strip().lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify another employee's daily progress")
    
    for field, val in updates.items():
        setattr(progress, field, val)
        
    await db.commit()
    await db.refresh(progress)
    await invalidate_cache("cache:daily_progress")
    return progress

@router.delete("/{progress_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_progress(
    progress_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user: Staff = Depends(require_permission("Verify & Rate Reports"))
):
    result = await db.execute(select(DailyProgress).where(DailyProgress.id == progress_id))
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail="Daily progress record not found")
    await db.delete(progress)
    await db.commit()
    await invalidate_cache("cache:daily_progress")
