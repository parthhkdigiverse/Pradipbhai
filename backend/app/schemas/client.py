import re
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator

class ClientBase(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = "Onboarding"
    trafficLight: Optional[str] = "Green"
    advanceRequired: Optional[int] = 0
    billingType: Optional[str] = "Monthly Billing"
    workStartAllowed: Optional[bool] = True
    deliveryAllowed: Optional[bool] = True
    clientSince: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            return v.strip()
        return None

class ClientCreate(ClientBase):
    id: Optional[str] = None
    model_config = ConfigDict(extra="ignore")

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    trafficLight: Optional[str] = None
    advanceRequired: Optional[int] = None
    billingType: Optional[str] = None
    workStartAllowed: Optional[bool] = None
    deliveryAllowed: Optional[bool] = None
    clientSince: Optional[str] = None

class ClientOut(ClientBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
