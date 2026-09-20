import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.worklog import WorkLog
from app.schemas.worklog import WorkLogCreate, WorkLogOut

router = APIRouter(prefix="/worklogs", tags=["Work Logs"])

@router.get("", response_model=List[WorkLogOut])
async def get_worklogs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkLog))
    return result.scalars().all()

@router.post("", response_model=WorkLogOut, status_code=status.HTTP_201_CREATED)
async def create_worklog(log_in: WorkLogCreate, db: AsyncSession = Depends(get_db)):
    log_id = log_in.id or f"wlog-{uuid.uuid4().hex[:8]}"
    wlog = WorkLog(
        id=log_id,
        staff_id=log_in.staff_id,
        staff_name=log_in.staff_name,
        job_id=log_in.job_id,
        job_title=log_in.job_title,
        date=log_in.date,
        hours=log_in.hours or 0.0,
        description=log_in.description
    )
    db.add(wlog)
    await db.commit()
    await db.refresh(wlog)
    return wlog

@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_worklog(log_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkLog).where(WorkLog.id == log_id))
    wlog = result.scalar_one_or_none()
    if not wlog:
        raise HTTPException(status_code=404, detail="Work log entry not found")
    await db.delete(wlog)
    await db.commit()
