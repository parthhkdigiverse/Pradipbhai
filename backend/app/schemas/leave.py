from typing import Optional
from pydantic import BaseModel, ConfigDict

class LeaveRequestBase(BaseModel):
    staff_id: str
    staff_name: str
    type: Optional[str] = "Casual"
    from_date: str
    to_date: str
    days: Optional[int] = 1
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

class LeaveRequestOut(LeaveRequestBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

class LeaveBalanceOut(BaseModel):
    staff_id: str
    casual: int
    sick: int
    earned: int
    model_config = ConfigDict(from_attributes=True)
