from typing import Optional
from pydantic import BaseModel, ConfigDict

class StaffBase(BaseModel):
    name: str
    role: Optional[str] = "Employee"
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = "Active"
    joinDate: Optional[str] = None
    baseSalary: Optional[float] = 0.0
    password: Optional[str] = None
    permissions: Optional[dict] = None

class StaffCreate(StaffBase):
    id: Optional[str] = None

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    joinDate: Optional[str] = None
    baseSalary: Optional[float] = None
    password: Optional[str] = None
    permissions: Optional[dict] = None

class StaffOut(StaffBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
