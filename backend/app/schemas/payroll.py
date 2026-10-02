from typing import Optional
from pydantic import BaseModel, ConfigDict

class PayrollBase(BaseModel):
    staff_id: str
    employee_name: str
    month: str
    salary: Optional[float] = 0.0
    bonus: Optional[float] = 0.0
    deductions: Optional[float] = 0.0
    net_salary: Optional[float] = 0.0
    status: Optional[str] = "Pending"
    account_type: Optional[str] = "Current A/c"

class PayrollCreate(PayrollBase):
    id: Optional[str] = None

class PayrollUpdate(BaseModel):
    salary: Optional[float] = None
    bonus: Optional[float] = None
    deductions: Optional[float] = None
    net_salary: Optional[float] = None
    status: Optional[str] = None
    account_type: Optional[str] = None

class PayrollOut(PayrollBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
