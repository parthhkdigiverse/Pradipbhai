from typing import Optional
from pydantic import BaseModel, ConfigDict

class AttendanceBase(BaseModel):
    staff_id: Optional[str] = None
    staff_name: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    work_hours: Optional[float] = 0.0
    overtime_hours: Optional[float] = 0.0
    status: Optional[str] = "Present"
    location: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    id: Optional[str] = None

class AttendanceUpdate(BaseModel):
    check_out: Optional[str] = None
    work_hours: Optional[float] = None
    overtime_hours: Optional[float] = None
    status: Optional[str] = None

class AttendanceOut(AttendanceBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
