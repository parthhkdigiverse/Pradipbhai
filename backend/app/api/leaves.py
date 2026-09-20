import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.leave import LeaveRequest, LeaveBalance
from app.schemas.leave import LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestOut, LeaveBalanceOut

router = APIRouter(prefix="/leaves", tags=["Leaves"])

@router.get("/requests", response_model=List[LeaveRequestOut])
async def get_leave_requests(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveRequest))
    return result.scalars().all()

@router.post("/requests", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED)
async def create_leave_request(req_in: LeaveRequestCreate, db: AsyncSession = Depends(get_db)):
    req_id = req_in.id or f"leave-{uuid.uuid4().hex[:8]}"
    leave_req = LeaveRequest(
        id=req_id,
        staff_id=req_in.staff_id,
        staff_name=req_in.staff_name,
        type=req_in.type or "Casual",
        from_date=req_in.from_date,
        to_date=req_in.to_date,
        days=req_in.days or 1,
        reason=req_in.reason,
        status=req_in.status or "Pending",
        applied_on=req_in.applied_on,
        reviewed_by=req_in.reviewed_by,
        review_note=req_in.review_note,
        reviewed_on=req_in.reviewed_on
    )
    db.add(leave_req)
    await db.commit()
    await db.refresh(leave_req)
    return leave_req

@router.put("/requests/{req_id}", response_model=LeaveRequestOut)
async def update_leave_request(req_id: str, req_in: LeaveRequestUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == req_id))
    leave_req = result.scalar_one_or_none()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    for field, val in req_in.model_dump(exclude_unset=True).items():
        setattr(leave_req, field, val)
        
    await db.commit()
    await db.refresh(leave_req)
    return leave_req

@router.get("/balances", response_model=List[LeaveBalanceOut])
async def get_leave_balances(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveBalance))
    return result.scalars().all()
