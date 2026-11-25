import uuid
from datetime import date, timedelta
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.leave import LeaveRequest, LeaveBalance
from app.models.attendance import Attendance
from app.models.staff import Staff
from app.models.holiday import Holiday
from app.cache import invalidate_cache
from app.schemas.leave import (
    LeaveRequestCreate,
    LeaveRequestUpdate,
    LeaveRequestOut,
    LeaveBalanceUpdate,
    LeaveBalanceOut,
)

router = APIRouter(prefix="/leaves", tags=["Leaves"])
CACHE_KEY_ATT = "cache:attendance"


def _expand_leave_dates(from_date: str, to_date: str | None) -> List[str]:
    if not from_date:
        return []
    try:
        start = date.fromisoformat(from_date[:10])
        end = date.fromisoformat((to_date or from_date)[:10])
    except ValueError:
        return [from_date]
    if end < start:
        return [from_date]
    out: List[str] = []
    cur = start
    while cur <= end:
        out.append(cur.isoformat())
        cur += timedelta(days=1)
    return out


def _leave_month_weights(
    from_date: str,
    to_date: str | None,
    days: float | None,
    is_half_day: bool | None,
    holiday_dates: set[str],
) -> Dict[str, float]:
    """Allocate leave days across YYYY-MM buckets, excluding company holidays."""
    dates = _expand_leave_dates(from_date, to_date)
    if not dates:
        return {}
    half = bool(is_half_day) or (days is not None and float(days) == 0.5)
    weights: Dict[str, float] = {}
    if half:
        d0 = dates[0]
        if d0 not in holiday_dates:
            weights[d0[:7]] = weights.get(d0[:7], 0.0) + 0.5
        return weights
    for d in dates:
        if d not in holiday_dates:
            mo = d[:7]
            weights[mo] = weights.get(mo, 0.0) + 1.0
    return weights


async def _cleanup_leave_attendance(db: AsyncSession, staff_id: str, from_date: str, to_date: str | None) -> None:
    """Remove auto-created Leave/Half Day attendance rows that have no punch data."""
    dates = _expand_leave_dates(from_date, to_date)
    if not dates:
        return
    res = await db.execute(
        select(Attendance).where(
            Attendance.staff_id == staff_id,
            Attendance.date.in_(dates),
        )
    )
    removed = False
    for att in res.scalars().all():
        has_punches = bool(att.punches) or bool(att.check_in) or bool(att.check_out)
        is_leave_status = (att.status == "Leave") or str(att.status or "").startswith("Half Day")
        if is_leave_status and not has_punches:
            await db.delete(att)
            removed = True
    if removed:
        await invalidate_cache(CACHE_KEY_ATT)


@router.get("/requests", response_model=List[LeaveRequestOut])
async def get_leave_requests(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveRequest))
    return result.scalars().all()


@router.post("/requests", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED)
async def create_leave_request(req_in: LeaveRequestCreate, db: AsyncSession = Depends(get_db)):
    req_type = req_in.type or "Casual"

    # Enforce Paid Earned Leave monthly quota (1 day/month by default, scaled by LeaveBalance.earned, no carry forward)
    if req_type == "Earned":
        hol_res = await db.execute(select(Holiday.date))
        holiday_dates = {row[0] for row in hol_res.all() if row[0]}

        bal_res = await db.execute(select(LeaveBalance).where(LeaveBalance.staff_id == req_in.staff_id))
        bal = bal_res.scalar_one_or_none()
        earned_quota = float(bal.earned if bal is not None else 12)
        monthly_quota = earned_quota / 12.0

        req_weights = _leave_month_weights(
            req_in.from_date, req_in.to_date, req_in.days, req_in.is_half_day, holiday_dates
        )
        if not req_weights and req_in.from_date:
            req_weights = {req_in.from_date[:7]: float(req_in.days or 1.0)}

        existing_earned = await db.execute(
            select(LeaveRequest).where(
                LeaveRequest.staff_id == req_in.staff_id,
                LeaveRequest.type == "Earned",
                LeaveRequest.status != "Rejected",
            )
        )
        existing_list = existing_earned.scalars().all()
        used_by_month: Dict[str, float] = {}
        for r in existing_list:
            w = _leave_month_weights(r.from_date, r.to_date, r.days, r.is_half_day, holiday_dates)
            for mo, amt in w.items():
                used_by_month[mo] = used_by_month.get(mo, 0.0) + amt

        for target_month, requested_days in req_weights.items():
            used_days = used_by_month.get(target_month, 0.0)
            if used_days >= monthly_quota or (used_days + requested_days) > monthly_quota:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Paid Earned Leave quota is {monthly_quota:g} day(s) per month (cannot be carry forwarded). "
                        f"Month {target_month} already has {used_days:g} day(s) used or pending. "
                        f"Additional leaves in the same month must be applied as Casual Leave."
                    ),
                )

    req_id = req_in.id or f"leave-{uuid.uuid4().hex[:8]}"
    leave_req = LeaveRequest(
        id=req_id,
        staff_id=req_in.staff_id,
        staff_name=req_in.staff_name,
        type=req_type,
        from_date=req_in.from_date,
        to_date=req_in.to_date,
        days=req_in.days or 1.0,
        is_half_day=req_in.is_half_day,
        half_day_session=req_in.half_day_session,
        reason=req_in.reason,
        status=req_in.status or "Pending",
        applied_on=req_in.applied_on,
        reviewed_by=req_in.reviewed_by,
        review_note=req_in.review_note,
        reviewed_on=req_in.reviewed_on,
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

    prev_status = leave_req.status
    updates = req_in.model_dump(exclude_unset=True)
    for field, val in updates.items():
        setattr(leave_req, field, val)

    if prev_status == "Approved" and leave_req.status in ("Rejected", "Pending"):
        await _cleanup_leave_attendance(db, leave_req.staff_id, leave_req.from_date, leave_req.to_date)

    await db.commit()
    await db.refresh(leave_req)
    return leave_req


@router.delete("/requests/{req_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_leave_request(req_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == req_id))
    leave_req = result.scalar_one_or_none()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave_req.status == "Approved":
        await _cleanup_leave_attendance(db, leave_req.staff_id, leave_req.from_date, leave_req.to_date)

    await db.delete(leave_req)
    await db.commit()


@router.get("/balances", response_model=List[LeaveBalanceOut])
async def get_leave_balances(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveBalance))
    return result.scalars().all()


@router.put("/balances/{staff_id}", response_model=LeaveBalanceOut)
async def upsert_leave_balance(staff_id: str, bal_in: LeaveBalanceUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveBalance).where(LeaveBalance.staff_id == staff_id))
    bal = result.scalar_one_or_none()
    if not bal:
        bal = LeaveBalance(
            staff_id=staff_id,
            casual=max(0, bal_in.casual if bal_in.casual is not None else 0),
            sick=max(0, bal_in.sick if bal_in.sick is not None else 3),
            earned=max(0, bal_in.earned if bal_in.earned is not None else 12),
        )
        db.add(bal)
    else:
        if bal_in.casual is not None:
            bal.casual = max(0, bal_in.casual)
        if bal_in.sick is not None:
            bal.sick = max(0, bal_in.sick)
        if bal_in.earned is not None:
            bal.earned = max(0, bal_in.earned)
    await db.commit()
    await db.refresh(bal)
    return bal


@router.post("/balances/reset", response_model=List[LeaveBalanceOut])
async def reset_leave_balances(db: AsyncSession = Depends(get_db)):
    staff_res = await db.execute(select(Staff.id))
    staff_ids = {row[0] for row in staff_res.all()}

    bal_res = await db.execute(select(LeaveBalance))
    existing = {b.staff_id: b for b in bal_res.scalars().all()}

    for sid in staff_ids | set(existing.keys()):
        if sid in existing:
            existing[sid].casual = 0
            existing[sid].sick = 3
            existing[sid].earned = 12
        else:
            db.add(LeaveBalance(staff_id=sid, casual=0, sick=3, earned=12))

    await db.commit()
    refreshed = await db.execute(select(LeaveBalance))
    return refreshed.scalars().all()
