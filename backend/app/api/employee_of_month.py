import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models.employee_of_month import EmployeeEvaluation
from app.schemas.employee_of_month import (
    EmployeeEvaluationCreate,
    EmployeeEvaluationUpdate,
    EmployeeEvaluationOut,
)
from app.cache import get_cache, set_cache, invalidate_cache

router = APIRouter(prefix="/employee-of-month", tags=["Employee of the Month"])
CACHE_KEY_EOM = "cache:employee_of_month:all"

@router.get("", response_model=List[EmployeeEvaluationOut])
async def get_evaluations(
    month: Optional[str] = Query(None, description="Filter by month e.g. 2026-10"),
    db: AsyncSession = Depends(get_db)
):
    cache_key = f"{CACHE_KEY_EOM}:{month or 'all'}"
    cached = await get_cache(cache_key)
    if cached is not None:
        return cached

    query = select(EmployeeEvaluation)
    if month:
        query = query.where(EmployeeEvaluation.month == month)
    query = query.order_by(EmployeeEvaluation.total_score.desc())

    result = await db.execute(query)
    evaluations = result.scalars().all()
    out = [EmployeeEvaluationOut.model_validate(e).model_dump() for e in evaluations]
    await set_cache(cache_key, out, expire_seconds=120)
    return evaluations

@router.post("", response_model=EmployeeEvaluationOut, status_code=status.HTTP_201_CREATED)
async def create_or_upsert_evaluation(
    eval_in: EmployeeEvaluationCreate,
    db: AsyncSession = Depends(get_db)
):
    # Check if an evaluation already exists for this employee in this month
    existing_res = await db.execute(
        select(EmployeeEvaluation).where(
            EmployeeEvaluation.employee_id == eval_in.employee_id,
            EmployeeEvaluation.month == eval_in.month
        )
    )
    existing = existing_res.scalar_one_or_none()

    percentage = 0.0
    if eval_in.max_score and eval_in.max_score > 0:
        percentage = round(((eval_in.total_score or 0.0) / eval_in.max_score) * 100, 1)

    if existing:
        # Update existing
        for field, val in eval_in.model_dump(exclude_unset=True, exclude={"id"}).items():
            setattr(existing, field, val)
        existing.percentage = percentage
        await db.commit()
        await db.refresh(existing)
        await invalidate_cache("cache:employee_of_month")
        return existing

    # Create new
    eval_id = eval_in.id or f"eom-{uuid.uuid4().hex[:10]}"
    new_eval = EmployeeEvaluation(
        id=eval_id,
        employee_id=eval_in.employee_id,
        employee_name=eval_in.employee_name,
        employee_role=eval_in.employee_role,
        month=eval_in.month,
        year=eval_in.year or 2026,
        criteria_scores=eval_in.criteria_scores or {},
        total_score=eval_in.total_score or 0.0,
        max_score=eval_in.max_score or 100.0,
        percentage=percentage,
        is_winner=eval_in.is_winner or False,
        badge=eval_in.badge,
        manager_remarks=eval_in.manager_remarks,
        evaluated_by=eval_in.evaluated_by,
        evaluated_by_role=eval_in.evaluated_by_role
    )
    db.add(new_eval)
    await db.commit()
    await db.refresh(new_eval)
    await invalidate_cache("cache:employee_of_month")
    return new_eval

@router.put("/{eval_id}", response_model=EmployeeEvaluationOut)
async def update_evaluation(
    eval_id: str,
    eval_in: EmployeeEvaluationUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(EmployeeEvaluation).where(EmployeeEvaluation.id == eval_id))
    eval_obj = result.scalar_one_or_none()
    if not eval_obj:
        raise HTTPException(status_code=404, detail="Evaluation record not found")

    for field, val in eval_in.model_dump(exclude_unset=True).items():
        setattr(eval_obj, field, val)

    if eval_obj.max_score and eval_obj.max_score > 0:
        eval_obj.percentage = round(((eval_obj.total_score or 0.0) / eval_obj.max_score) * 100, 1)

    await db.commit()
    await db.refresh(eval_obj)
    await invalidate_cache("cache:employee_of_month")
    return eval_obj

@router.post("/{eval_id}/crown", response_model=EmployeeEvaluationOut)
async def crown_winner(
    eval_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(EmployeeEvaluation).where(EmployeeEvaluation.id == eval_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Evaluation record not found")

    # Un-crown any other winner for this month
    await db.execute(
        update(EmployeeEvaluation)
        .where(EmployeeEvaluation.month == target.month)
        .values(is_winner=False)
    )

    target.is_winner = True
    if not target.badge:
        target.badge = "Employee of the Month"

    await db.commit()
    await db.refresh(target)
    await invalidate_cache("cache:employee_of_month")
    return target

@router.delete("/{eval_id}")
async def delete_evaluation(
    eval_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(EmployeeEvaluation).where(EmployeeEvaluation.id == eval_id))
    eval_obj = result.scalar_one_or_none()
    if not eval_obj:
        raise HTTPException(status_code=404, detail="Evaluation record not found")

    await db.delete(eval_obj)
    await db.commit()
    await invalidate_cache("cache:employee_of_month")
    return {"status": "success", "message": "Evaluation record deleted"}
