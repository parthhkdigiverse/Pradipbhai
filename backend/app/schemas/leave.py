from typing import Optional
from pydantic import BaseModel, ConfigDict

class LeaveRequestBase(BaseModel):
    staff_id: str
    staff_name: str
    type: Optional[str] = "Casual"
    from_date: str
    to_date: str
    days: Optional[float] = 1.0
    is_half_day: Optional[bool] = False
    half_day_session: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = "Pending"
    applied_on: Optional[str] = None
    reviewed_by: Optional[str] = None
    review_note: Optional[str] = None
    reviewed_on: Optional[str] = None

class LeaveRequestCreate(LeaveRequestBase):
    id: Optional[str] = None

class LeaveRequestUpdate(BaseModel):
    status: Optional[str] = None
    reviewed_by: Optional[str] = None
    review_note: Optional[str] = None
    reviewed_on: Optional[str] = None
    is_half_day: Optional[bool] = None
    half_day_session: Optional[str] = None

class LeaveRequestOut(LeaveRequestBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

class LeaveBalanceOut(BaseModel):
    staff_id: str
    casual: int
    sick: int
    earned: int
    model_config = ConfigDict(from_attributes=True)
