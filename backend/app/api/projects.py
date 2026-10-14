import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectOut])
async def get_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return result.scalars().all()

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(project_in: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project_id = project_in.id or f"proj-{uuid.uuid4().hex[:8]}"
    client_id = project_in.client_id or project_in.clientId
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
        
    title = project_in.title or project_in.name or "Untitled Project"
    name = project_in.name or title
    calendar = project_in.content_calendar if project_in.content_calendar is not None else project_in.contentCalendar
    product_id = project_in.product_id or project_in.productId
    
    project = Project(
        id=project_id,
        title=title,
        name=name,
        client_id=client_id,
        category=project_in.category or "Designing",
        status=project_in.status or "Planning",
        budget=project_in.budget or 0.0,
        deadline=project_in.deadline,
        product_id=product_id,
        content_calendar=calendar or []
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, project_in: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project_in.name is not None or project_in.title is not None:
        val = project_in.name or project_in.title
        project.title = val
        project.name = val
    if project_in.client_id is not None or project_in.clientId is not None:
        project.client_id = project_in.client_id or project_in.clientId
    if project_in.category is not None:
        project.category = project_in.category
    if project_in.status is not None:
        project.status = project_in.status
    if project_in.budget is not None:
        project.budget = project_in.budget
    if project_in.deadline is not None:
        project.deadline = project_in.deadline
    if project_in.product_id is not None or project_in.productId is not None:
        project.product_id = project_in.product_id or project_in.productId
    if project_in.content_calendar is not None or project_in.contentCalendar is not None:
        cal = project_in.content_calendar if project_in.content_calendar is not None else project_in.contentCalendar
        project.content_calendar = list(cal) if isinstance(cal, list) else cal
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(project, "content_calendar")
        
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
