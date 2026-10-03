from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict

class DailyProgressBase(BaseModel):
    employee_name: str
    role: Optional[str] = None
    date: str
    submitted_at: Optional[str] = None
    tasks_done: Optional[List[Any]] = []
    tasks_pending: Optional[List[Any]] = []
    hours_logged: Optional[float] = 0.0
    verification_status: Optional[str] = "Pending"
    rating: Optional[int] = 0
    manager_remarks: Optional[str] = None
    verified_by: Optional[str] = None

class DailyProgressCreate(DailyProgressBase):
    id: Optional[str] = None

class DailyProgressUpdate(BaseModel):
    tasks_done: Optional[List[Any]] = None
    tasks_pending: Optional[List[Any]] = None
    hours_logged: Optional[float] = None
    verification_status: Optional[str] = None
    rating: Optional[int] = None
    manager_remarks: Optional[str] = None
    verified_by: Optional[str] = None

class DailyProgressOut(DailyProgressBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
