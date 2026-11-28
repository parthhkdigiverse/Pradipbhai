import math
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.lead import Lead
from app.models.staff import Staff
from app.schemas.lead import LeadCreate, LeadUpdate, LeadOut
from app.api.deps import require_permission

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("", response_model=List[LeadOut])
async def get_leads(
    skip: int = Query(0, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=10000),
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("View Leads", "Create/Edit Leads")),
):
    stmt = select(Lead).order_by(Lead.created_at.desc(), Lead.id).offset(skip)
    if limit is not None:
        stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/paginated")
async def get_leads_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    hot_only: bool = False,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("View Leads", "Create/Edit Leads")),
) -> Dict[str, Any]:
    filters = []
    norm_search = (search or "").strip().lower()
    if norm_search:
        pattern = f"%{norm_search}%"
        filters.append(
            or_(
                func.lower(func.coalesce(Lead.company, "")).like(pattern),
                func.lower(func.coalesce(Lead.contact, "")).like(pattern),
                func.lower(func.coalesce(Lead.email, "")).like(pattern),
                func.lower(func.coalesce(Lead.phone, "")).like(pattern),
                func.lower(func.coalesce(Lead.source, "")).like(pattern),
                func.lower(func.coalesce(Lead.category, "")).like(pattern),
            )
        )
    if status_filter and status_filter.strip().lower() != "all":
        filters.append(Lead.status == status_filter.strip())
    if category and category.strip().lower() != "all":
        filters.append(Lead.category == category.strip())
    if hot_only:
        filters.append(Lead.is_hot.is_(True))

    count_stmt = select(func.count(Lead.id))
    data_stmt = select(Lead).order_by(Lead.created_at.desc(), Lead.id)
    if filters:
        count_stmt = count_stmt.where(*filters)
        data_stmt = data_stmt.where(*filters)

    total_res = await db.execute(count_stmt)
    total = int(total_res.scalar_one_or_none() or 0)
    total_pages = max(1, math.ceil(total / page_size))
    safe_page = min(page, total_pages)
    offset = (safe_page - 1) * page_size

    rows_res = await db.execute(data_stmt.offset(offset).limit(page_size))
    items = [LeadOut.model_validate(l).model_dump() for l in rows_res.scalars().all()]

    return {
        "items": items,
        "total": total,
        "page": safe_page,
        "page_size": page_size,
        "total_pages": total_pages,
    }

@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_in: LeadCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("Create/Edit Leads")),
):
    lead_id = lead_in.id or f"lead-{uuid.uuid4().hex[:8]}"
    lead = Lead(
        id=lead_id,
        company=lead_in.company,
        contact=lead_in.contact,
        email=lead_in.email,
        phone=lead_in.phone,
        source=lead_in.source or "Website",
        category=lead_in.category or "Hot Lead",
        status=lead_in.status or "Lead",
        priority=lead_in.priority or "High",
        is_hot=lead_in.is_hot or False,
        expected_income=lead_in.expected_income or 0.0,
        created_by_user_name=lead_in.created_by_user_name or "Admin",
        date=lead_in.date,
        follow_ups=lead_in.follow_ups or []
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead

@router.put("/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: str,
    lead_in: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("Create/Edit Leads")),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    for field, val in lead_in.model_dump(exclude_unset=True).items():
        setattr(lead, field, val)
        
    await db.commit()
    await db.refresh(lead)
    return lead

@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("Delete Leads")),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.commit()
