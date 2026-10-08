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
    result = await db.execute(select(Job).order_by(Job.createdAt.desc()))
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

import os
import sys
import subprocess
import platform
from pydantic import BaseModel

class OpenFolderRequest(BaseModel):
    path: str

@router.post("/open-folder")
async def open_folder(req: OpenFolderRequest):
    folder_path = req.path.strip()
    if not folder_path:
        raise HTTPException(status_code=400, detail="Path cannot be empty")

    clean_path = folder_path.strip('"').strip("'")

    # Handle URLs directly
    if clean_path.startswith(("http://", "https://", "ftp://", "smb://", "file://")):
        return {"status": "url", "url": clean_path}

    system_os = platform.system()

    try:
        if system_os == "Windows":
            if os.path.exists(clean_path):
                os.startfile(clean_path)
            else:
                subprocess.Popen(["explorer", clean_path])
        elif system_os == "Darwin":  # macOS
            subprocess.Popen(["open", clean_path])
        else:  # Linux
            subprocess.Popen(["xdg-open", clean_path])
        return {"status": "success", "message": f"Opened {clean_path} in file explorer", "path": clean_path}
    except Exception as e:
        return {"status": "error", "detail": str(e), "path": clean_path}
