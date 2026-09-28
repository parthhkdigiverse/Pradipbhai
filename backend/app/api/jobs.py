from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobUpdate, JobOut

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("", response_model=List[JobOut])
async def get_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job))
    return result.scalars().all()

@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(job_in: JobCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Job).where(Job.id == job_in.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Job ID already exists")

    job = Job(**job_in.model_dump())
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job

@router.put("/{job_id}", response_model=JobOut)
async def update_job(job_id: str, job_in: JobUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    for field, val in job_in.model_dump(exclude_unset=True).items():
        setattr(job, field, val)
        
    await db.commit()
    await db.refresh(job)
    return job

@router.delete("/{job_id}")
async def delete_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
    await db.commit()
    return {"message": "Job deleted"}
