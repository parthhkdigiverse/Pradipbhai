import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadUpdate, LeadOut

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("", response_model=List[LeadOut])
async def get_leads(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(lead_in: LeadCreate, db: AsyncSession = Depends(get_db)):
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
async def update_lead(lead_id: str, lead_in: LeadUpdate, db: AsyncSession = Depends(get_db)):
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
async def delete_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.commit()
