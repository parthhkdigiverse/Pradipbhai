from typing import Optional
from pydantic import BaseModel, ConfigDict

class WorkLogBase(BaseModel):
    staff_id: Optional[str] = None
    staff_name: str
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    date: str
    hours: Optional[float] = 0.0
    description: Optional[str] = None

class WorkLogCreate(WorkLogBase):
    id: Optional[str] = None

class WorkLogOut(WorkLogBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
