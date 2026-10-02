import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.payroll import PayrollRecord
from app.schemas.payroll import PayrollCreate, PayrollUpdate, PayrollOut

router = APIRouter(prefix="/payroll", tags=["Payroll"])

@router.get("", response_model=List[PayrollOut])
async def get_payroll_records(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PayrollRecord))
    return result.scalars().all()

@router.post("", response_model=PayrollOut, status_code=status.HTTP_201_CREATED)
async def create_payroll(payroll_in: PayrollCreate, db: AsyncSession = Depends(get_db)):
    payroll_id = payroll_in.id or f"pay-{uuid.uuid4().hex[:8]}"
    payroll = PayrollRecord(
        id=payroll_id,
        staff_id=payroll_in.staff_id,
        employee_name=payroll_in.employee_name,
        month=payroll_in.month,
        salary=payroll_in.salary or 0.0,
        bonus=payroll_in.bonus or 0.0,
        deductions=payroll_in.deductions or 0.0,
        net_salary=payroll_in.net_salary or 0.0,
        status=payroll_in.status or "Pending",
        account_type=payroll_in.account_type or "Current A/c"
    )
    db.add(payroll)
    await db.commit()
    await db.refresh(payroll)
    return payroll

@router.put("/{payroll_id}", response_model=PayrollOut)
async def update_payroll(payroll_id: str, payroll_in: PayrollUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PayrollRecord).where(PayrollRecord.id == payroll_id))
    payroll = result.scalar_one_or_none()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    
    for field, val in payroll_in.model_dump(exclude_unset=True).items():
        setattr(payroll, field, val)
        
    await db.commit()
    await db.refresh(payroll)
    return payroll

@router.delete("/{payroll_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payroll(payroll_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PayrollRecord).where(PayrollRecord.id == payroll_id))
    payroll = result.scalar_one_or_none()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    await db.delete(payroll)
    await db.commit()
