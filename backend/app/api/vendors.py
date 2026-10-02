import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorOut

router = APIRouter(prefix="/vendors", tags=["Vendors"])

@router.get("", response_model=List[VendorOut])
async def get_vendors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vendor))
    return result.scalars().all()

@router.post("", response_model=VendorOut, status_code=status.HTTP_201_CREATED)
async def create_vendor(vendor_in: VendorCreate, db: AsyncSession = Depends(get_db)):
    vendor_id = vendor_in.id or f"vendor-{uuid.uuid4().hex[:8]}"
    vendor = Vendor(
        id=vendor_id,
        name=vendor_in.name,
        description=vendor_in.description,
        category=vendor_in.category or "General"
    )
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor

@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(vendor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    await db.delete(vendor)
    await db.commit()
