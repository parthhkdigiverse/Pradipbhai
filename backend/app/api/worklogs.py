import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.staff import Staff
from app.models.worklog import WorkLog
from app.schemas.worklog import WorkLogCreate, WorkLogUpdate, WorkLogOut
from app.api.deps import (
    check_any_permission,
    get_current_user,
    is_admin_or_manager,
    require_permission,
)

router = APIRouter(prefix="/worklogs", tags=["Work Logs"])

@router.get("", response_model=List[WorkLogOut])
async def get_worklogs(
    skip: int = 0,
    limit: int = 2000,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(get_current_user),
):
    stmt = select(WorkLog)
    can_view_all = is_admin_or_manager(current_user) or await check_any_permission(
        current_user, ("Verify & Rate Reports", "Manage Payroll"), db
    )
    if not can_view_all:
        stmt = stmt.where(WorkLog.staff_id == current_user.id)
    result = await db.execute(
        stmt
        .order_by(WorkLog.date.desc(), WorkLog.start_time.desc(), WorkLog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("", response_model=WorkLogOut, status_code=status.HTTP_201_CREATED)
async def create_worklog(
    log_in: WorkLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(require_permission("Add Work Log", "Punch In/Out")),
):
    can_create_for_others = is_admin_or_manager(current_user) or await check_any_permission(
        current_user, ("Verify & Rate Reports", "Manage Payroll"), db
    )
    if not can_create_for_others and log_in.staff_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied: cannot log work for another staff member")

    staff_id = log_in.staff_id if can_create_for_others else current_user.id
    staff_name = log_in.staff_name if can_create_for_others else current_user.name

    log_id = log_in.id or f"wlog-{uuid.uuid4().hex[:8]}"
    wlog = WorkLog(
        id=log_id,
        staff_id=staff_id,
        staff_name=staff_name,
        job_id=log_in.job_id,
        job_title=log_in.job_title,
        date=log_in.date,
        hours=log_in.hours or 0.0,
        start_time=log_in.start_time,
        end_time=log_in.end_time,
        duration=log_in.duration,
        description=log_in.description
    )
    db.add(wlog)
    await db.commit()
    await db.refresh(wlog)
    return wlog

@router.put("/{log_id}", response_model=WorkLogOut)
async def update_worklog(
    log_id: str,
    log_in: WorkLogUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(get_current_user),
):
    if not is_admin_or_manager(current_user):
        raise HTTPException(status_code=403, detail="Admin or Manager access required to modify work logs")
    result = await db.execute(select(WorkLog).where(WorkLog.id == log_id))
    wlog = result.scalar_one_or_none()
    if not wlog:
        raise HTTPException(status_code=404, detail="Work log entry not found")
    
    for field, val in log_in.model_dump(exclude_unset=True).items():
        setattr(wlog, field, val)
        
    await db.commit()
    await db.refresh(wlog)
    return wlog

@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_worklog(
    log_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(get_current_user),
):
    if not is_admin_or_manager(current_user):
        raise HTTPException(status_code=403, detail="Admin or Manager access required to delete work logs")
    result = await db.execute(select(WorkLog).where(WorkLog.id == log_id))
    wlog = result.scalar_one_or_none()
    if not wlog:
        raise HTTPException(status_code=404, detail="Work log entry not found")
    await db.delete(wlog)
    await db.commit()
