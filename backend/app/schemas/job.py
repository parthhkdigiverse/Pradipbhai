from typing import Optional
from pydantic import BaseModel, ConfigDict

class JobBase(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = "Designing"
    clientId: Optional[str] = None
    projectId: Optional[str] = None
    productId: Optional[str] = None
    printerId: Optional[str] = None
    teamId: Optional[str] = None
    dueDate: Optional[str] = None
    totalAmount: Optional[float] = 0.0
    paidAmount: Optional[float] = 0.0
    status: Optional[str] = "Pending"
    paymentStatus: Optional[str] = "Unpaid"
    vendorEmailSent: Optional[bool] = False
    workLink: Optional[str] = None
    workLocation: Optional[str] = None
    estimatedTime: Optional[float] = None
    estimatedTimeUnit: Optional[str] = "Hours"
    trackedTime: Optional[float] = 0.0
    delayReason: Optional[str] = None
    createdBy: Optional[str] = "Admin"
    createdAt: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    clientId: Optional[str] = None
    projectId: Optional[str] = None
    productId: Optional[str] = None
    printerId: Optional[str] = None
    teamId: Optional[str] = None
    dueDate: Optional[str] = None
    totalAmount: Optional[float] = None
    paidAmount: Optional[float] = None
    status: Optional[str] = None
    paymentStatus: Optional[str] = None
    vendorEmailSent: Optional[bool] = None
    workLink: Optional[str] = None
    workLocation: Optional[str] = None
    estimatedTime: Optional[float] = None
    estimatedTimeUnit: Optional[str] = None
    trackedTime: Optional[float] = None
    delayReason: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None

class JobOut(JobBase):
    class Config:
        from_attributes = True
