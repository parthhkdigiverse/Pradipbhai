import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobUpdate, JobOut
from app.cache import get_cache, set_cache, invalidate_cache

router = APIRouter(prefix="/jobs", tags=["Jobs"])
CACHE_KEY = "cache:jobs:all"

@router.get("", response_model=List[JobOut])
async def get_jobs(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    cached = await get_cache(f"{CACHE_KEY}:{skip}:{limit}")
    if cached is not None:
        return cached

    result = await db.execute(select(Job).offset(skip).limit(limit))
    jobs = result.scalars().all()
    
    jobs_dict = [JobOut.model_validate(j).model_dump() for j in jobs]
    await set_cache(f"{CACHE_KEY}:{skip}:{limit}", jobs_dict, expire_seconds=300)
    
    return jobs

@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(job_in: JobCreate, db: AsyncSession = Depends(get_db)):
    job_id = job_in.id or f"job-{uuid.uuid4().hex[:8]}"
    job = Job(
        id=job_id,
        title=job_in.title,
        client_id=job_in.client_id,
        project_id=job_in.project_id,
        assigned_staff_id=job_in.assigned_staff_id,
        status=job_in.status or "Pending",
        total_amount=job_in.total_amount or 0.0
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    await invalidate_cache(CACHE_KEY)
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
    await invalidate_cache(CACHE_KEY)
    return job

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
    await db.commit()
    await invalidate_cache(CACHE_KEY)
