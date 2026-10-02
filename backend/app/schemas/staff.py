import re
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator

class StaffBase(BaseModel):
    name: str
    role: Optional[str] = "Employee"
    email: Optional[str] = None
    phone: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            pattern = r'^\+?[0-9\s\-\(\)]{7,20}$'
            if not re.match(pattern, v.strip()):
                raise ValueError("Invalid phone number format")
        return v
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
