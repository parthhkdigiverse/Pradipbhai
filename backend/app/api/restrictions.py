from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.restriction import AccessRestriction

router = APIRouter(prefix="/restrictions", tags=["Access Restrictions"])

class RestrictionUpdate(BaseModel):
    ipWhitelist: Optional[List[str]] = None
    enableTimeRestrictions: Optional[bool] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    enableGeoRestrictions: Optional[bool] = None
    allowedPincodes: Optional[List[Any]] = None

@router.get("")
async def get_restrictions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AccessRestriction).where(AccessRestriction.id == "default"))
    restriction = result.scalar_one_or_none()
    
    if not restriction:
        return {
            "id": "default",
            "ipWhitelist": [],
            "enableTimeRestrictions": False,
            "startTime": "09:00",
            "endTime": "18:00",
            "enableGeoRestrictions": False,
            "allowedPincodes": []
        }
        
    return restriction.to_dict()

@router.post("")
async def save_restrictions(payload: RestrictionUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AccessRestriction).where(AccessRestriction.id == "default"))
    restriction = result.scalar_one_or_none()
    
    if not restriction:
        restriction = AccessRestriction(id="default")
        db.add(restriction)
        
    if payload.ipWhitelist is not None:
        restriction.ip_whitelist = payload.ipWhitelist
    if payload.enableTimeRestrictions is not None:
        restriction.enable_time_restrictions = payload.enableTimeRestrictions
    if payload.startTime is not None:
        restriction.start_time = payload.startTime
    if payload.endTime is not None:
        restriction.end_time = payload.endTime
    if payload.enableGeoRestrictions is not None:
        restriction.enable_geo_restrictions = payload.enableGeoRestrictions
    if payload.allowedPincodes is not None:
        restriction.allowed_pincodes = payload.allowedPincodes

    await db.commit()
    await db.refresh(restriction)
    return restriction.to_dict()
