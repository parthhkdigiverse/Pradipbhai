import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorOut

router = APIRouter(prefix="/vendors", tags=["Vendors"])

@router.get("", response_model=List[VendorOut])
async def get_vendors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vendor))
    return result.scalars().all()

@router.post("", response_model=VendorOut, status_code=status.HTTP_201_CREATED)
async def create_vendor(vendor_in: VendorCreate, db: AsyncSession = Depends(get_db)):
    trimmed_name = vendor_in.name.strip()
    category = vendor_in.category or "Printer"

    # Check duplicate name + category (case-insensitive name match)
    duplicate = await db.execute(
        select(Vendor).where(
            func.lower(Vendor.name) == trimmed_name.lower(),
            func.coalesce(Vendor.category, "Printer") == category
        )
    )
    if duplicate.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"A vendor named '{trimmed_name}' with category '{category}' already exists."
        )

    vendor_id = vendor_in.id or f"vendor-{uuid.uuid4().hex[:8]}"
    vendor = Vendor(
        id=vendor_id,
        name=trimmed_name,
        description=vendor_in.description,
        category=category
    )
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor

@router.put("/{vendor_id}", response_model=VendorOut)
async def update_vendor(vendor_id: str, vendor_in: VendorUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    db_vendor = result.scalar_one_or_none()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    new_name = vendor_in.name.strip() if vendor_in.name is not None else db_vendor.name
    new_category = vendor_in.category if vendor_in.category is not None else (db_vendor.category or "Printer")

    # Check duplicate name + category for other vendors
    duplicate = await db.execute(
        select(Vendor).where(
            Vendor.id != vendor_id,
            func.lower(Vendor.name) == new_name.lower(),
            func.coalesce(Vendor.category, "Printer") == new_category
        )
    )
    if duplicate.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"A vendor named '{new_name}' with category '{new_category}' already exists."
        )

    if vendor_in.name is not None:
        db_vendor.name = new_name
    if vendor_in.description is not None:
        db_vendor.description = vendor_in.description
    if vendor_in.category is not None:
        db_vendor.category = new_category

    await db.commit()
    await db.refresh(db_vendor)
    return db_vendor

@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(vendor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    await db.delete(vendor)
    await db.commit()
