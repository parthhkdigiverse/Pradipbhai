from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, AliasChoices

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
    type: Optional[str] = None
    from_date: Optional[str] = Field(None, validation_alias=AliasChoices("from_date", "fromDate"))
    to_date: Optional[str] = Field(None, validation_alias=AliasChoices("to_date", "toDate"))
    days: Optional[float] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    reviewed_by: Optional[str] = Field(None, validation_alias=AliasChoices("reviewed_by", "reviewedBy"))
    review_note: Optional[str] = Field(None, validation_alias=AliasChoices("review_note", "reviewNote"))
    reviewed_on: Optional[str] = Field(None, validation_alias=AliasChoices("reviewed_on", "reviewedOn"))
    is_half_day: Optional[bool] = Field(None, validation_alias=AliasChoices("is_half_day", "isHalfDay"))
    half_day_session: Optional[str] = Field(None, validation_alias=AliasChoices("half_day_session", "halfDaySession"))

class LeaveRequestOut(LeaveRequestBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

class LeaveBalanceUpdate(BaseModel):
    casual: Optional[int] = None
    sick: Optional[int] = None
    earned: Optional[int] = None

class LeaveBalanceOut(BaseModel):
    staff_id: str
    casual: int
    sick: int
    earned: int
    model_config = ConfigDict(from_attributes=True)
