from typing import Optional
from pydantic import BaseModel, ConfigDict

class JobBase(BaseModel):
    title: str
    client_id: str
    project_id: Optional[str] = None
    assigned_staff_id: Optional[str] = None
    status: Optional[str] = "Pending"
    total_amount: Optional[float] = 0.0

class JobCreate(JobBase):
    id: Optional[str] = None

class JobUpdate(BaseModel):
    title: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    assigned_staff_id: Optional[str] = None
    status: Optional[str] = None
    total_amount: Optional[float] = None

class JobOut(JobBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
