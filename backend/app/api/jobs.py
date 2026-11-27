from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.job import Job
from app.models.staff import Staff
from app.schemas.job import JobCreate, JobUpdate, JobOut

from app.cache import get_cache, set_cache, invalidate_cache
from app.api.deps import (
    check_user_permission,
    get_current_user,
    is_admin_or_manager,
    require_permission,
)

ALLOWED_EMPLOYEE_JOB_FIELDS = {
    "status",
    "startedAt",
    "trackedTime",
    "workLink",
    "workLocation",
    "delayReason",
}
RESTRICTED_EMPLOYEE_JOB_STATUSES = {"completed", "done"}

router = APIRouter(prefix="/jobs", tags=["Jobs"])
CACHE_KEY = "cache:jobs:all"

@router.get("", response_model=List[JobOut])
async def get_jobs(db: AsyncSession = Depends(get_db)):
    cached = await get_cache(CACHE_KEY)
    if cached is not None:
        return cached

    result = await db.execute(select(Job).order_by(Job.createdAt.desc()))
    jobs = result.scalars().all()
    jobs_dict = [JobOut.model_validate(j).model_dump() for j in jobs]
    await set_cache(CACHE_KEY, jobs_dict, expire_seconds=120)
    return jobs

@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_in: JobCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("Create Job")),
):
    existing = await db.execute(select(Job).where(Job.id == job_in.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Job ID already exists")

    job_data = job_in.model_dump()
    is_des_print = job_data.get("type") == "Des+Print" or (job_data.get("title") or "").startswith("[PRINT]")
    if job_data.get("type") == "Printing" and not is_des_print and job_data.get("status") in [None, "Pending"]:
        job_data["status"] = "In Progress"
    
    if job_data.get("status") in ["Progress", "In Progress"] and not job_data.get("startedAt"):
        from datetime import datetime, timezone
        job_data["startedAt"] = datetime.now(timezone.utc).isoformat()

    job = Job(**job_data)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    await invalidate_cache("cache:jobs")
    return job

@router.put("/{job_id}", response_model=JobOut)
async def update_job(
    job_id: str,
    job_in: JobUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(get_current_user),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    updates = job_in.model_dump(exclude_unset=True)
    can_full_edit = is_admin_or_manager(current_user) or await check_user_permission(current_user, "Edit Job", db)
    if not can_full_edit:
        if not await check_user_permission(current_user, "View Jobs", db):
            raise HTTPException(status_code=403, detail="Permission denied: View Jobs or Edit Job required")
        disallowed = set(updates.keys()) - ALLOWED_EMPLOYEE_JOB_FIELDS
        if disallowed:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: Edit Job required to modify {', '.join(sorted(disallowed))}",
            )
        new_status = str(updates.get("status") or "").strip().lower()
        if new_status in RESTRICTED_EMPLOYEE_JOB_STATUSES:
            raise HTTPException(
                status_code=403,
                detail="Permission denied: only managers or users with Edit Job can mark a job Completed",
            )

    if updates.get("status") in ["Progress", "In Progress"] and not getattr(job, "startedAt", None) and not updates.get("startedAt"):
        from datetime import datetime, timezone
        updates["startedAt"] = datetime.now(timezone.utc).isoformat()
    elif "status" in updates and updates.get("status") not in ["Progress", "In Progress"] and "startedAt" not in updates:
        updates["startedAt"] = None

    for field, val in updates.items():
        setattr(job, field, val)
        
    await db.commit()
    await db.refresh(job)
    await invalidate_cache("cache:jobs")
    return job

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("Delete Job")),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
    await db.commit()
    await invalidate_cache("cache:jobs")

import os
import sys
import subprocess
import platform
from pydantic import BaseModel

class OpenFolderRequest(BaseModel):
    path: str

@router.post("/open-folder")
async def open_folder(
    req: OpenFolderRequest,
    request: Request,
    current_user: Staff = Depends(get_current_user),
):
    if not is_admin_or_manager(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admins or Managers can open server folders")

    folder_path = req.path.strip()
    if not folder_path or "\x00" in folder_path:
        raise HTTPException(status_code=400, detail="Invalid path")

    clean_path = folder_path.strip('"').strip("'")

    # Allow only web URLs to be returned to the browser client
    if clean_path.startswith(("http://", "https://")):
        return {"status": "url", "url": clean_path}

    if "://" in clean_path:
        raise HTTPException(status_code=400, detail="Unsupported URI scheme")

    # Local OS file-manager launch is permitted only from loopback requests to existing directories
    client_host = (request.client.host if request.client else "") or ""
    if client_host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Server-side folder launch is restricted to localhost sessions",
        )

    real_path = os.path.realpath(clean_path)
    if not os.path.isdir(real_path):
        raise HTTPException(status_code=400, detail="Target directory does not exist on server")

    system_os = platform.system()

    try:
        if system_os == "Windows":
            os.startfile(real_path)
        elif system_os == "Darwin":  # macOS
            subprocess.Popen(["open", real_path])
        else:  # Linux
            subprocess.Popen(["xdg-open", real_path])
        return {"status": "success", "message": f"Opened {real_path} in file explorer", "path": real_path}
    except Exception as e:
        return {"status": "error", "detail": str(e), "path": real_path}
