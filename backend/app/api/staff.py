import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffUpdate, StaffOut
from app.cache import get_cache, set_cache, invalidate_cache

router = APIRouter(prefix="/staff", tags=["Staff"])
CACHE_KEY = "cache:staff:all"

@router.get("", response_model=List[StaffOut])
async def get_staff(db: AsyncSession = Depends(get_db)):
    cached = await get_cache(CACHE_KEY)
    if cached is not None:
        return cached

    result = await db.execute(select(Staff))
    staff_members = result.scalars().all()
    
    staff_dict = []
    for s in staff_members:
        staff_dict.append({
            "id": s.id,
            "name": s.name,
            "role": s.role,
            "email": s.email,
            "phone": s.phone,
            "status": s.status,
            "joinDate": s.join_date,
            "baseSalary": s.base_salary,
            "password": s.password,
            "permissions": s.permissions
        })
    
    await set_cache(CACHE_KEY, staff_dict, expire_seconds=300)
    return staff_dict

@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
async def create_staff(staff_in: StaffCreate, db: AsyncSession = Depends(get_db)):
    staff_id = staff_in.id or f"emp-{uuid.uuid4().hex[:8]}"
    staff_member = Staff(
        id=staff_id,
        name=staff_in.name,
        role=staff_in.role or "Employee",
        email=staff_in.email,
        phone=staff_in.phone,
        status=staff_in.status or "Active",
        join_date=staff_in.joinDate,
        base_salary=staff_in.baseSalary or 0.0,
        password=staff_in.password or "password",
        permissions=staff_in.permissions
    )
    db.add(staff_member)
    await db.commit()
    await db.refresh(staff_member)
    
    await invalidate_cache(CACHE_KEY)
    
    return {
        "id": staff_member.id,
        "name": staff_member.name,
        "role": staff_member.role,
        "email": staff_member.email,
        "phone": staff_member.phone,
        "status": staff_member.status,
        "joinDate": staff_member.join_date,
        "baseSalary": staff_member.base_salary,
        "password": staff_member.password,
        "permissions": staff_member.permissions
    }

@router.put("/{staff_id}", response_model=StaffOut)
async def update_staff(staff_id: str, staff_in: StaffUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff_member = result.scalar_one_or_none()
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    update_data = staff_in.model_dump(exclude_unset=True)
    if "joinDate" in update_data:
        staff_member.join_date = update_data.pop("joinDate")
    if "baseSalary" in update_data:
        staff_member.base_salary = update_data.pop("baseSalary")
        
    for field, val in update_data.items():
        setattr(staff_member, field, val)
        
    await db.commit()
    await db.refresh(staff_member)
    await invalidate_cache(CACHE_KEY)
    
    return {
        "id": staff_member.id,
        "name": staff_member.name,
        "role": staff_member.role,
        "email": staff_member.email,
        "phone": staff_member.phone,
        "status": staff_member.status,
        "joinDate": staff_member.join_date,
        "baseSalary": staff_member.base_salary,
        "password": staff_member.password,
        "permissions": staff_member.permissions
    }

@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(staff_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff_member = result.scalar_one_or_none()
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    await db.delete(staff_member)
    await db.commit()
    await invalidate_cache(CACHE_KEY)
