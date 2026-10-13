from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict

class ProjectBase(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    client_id: Optional[str] = None
    category: Optional[str] = "Designing"
    status: Optional[str] = "Planning"
    budget: Optional[float] = 0.0
    deadline: Optional[str] = None
    product_id: Optional[str] = None
    content_calendar: Optional[List[Any]] = None

class ProjectCreate(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    name: Optional[str] = None
    client_id: Optional[str] = None
    clientId: Optional[str] = None
    category: Optional[str] = "Designing"
    status: Optional[str] = "Planning"
    budget: Optional[float] = 0.0
    deadline: Optional[str] = None
    product_id: Optional[str] = None
    productId: Optional[str] = None
    content_calendar: Optional[List[Any]] = None
    contentCalendar: Optional[List[Any]] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    client_id: Optional[str] = None
    clientId: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[float] = None
    deadline: Optional[str] = None
    product_id: Optional[str] = None
    productId: Optional[str] = None
    content_calendar: Optional[List[Any]] = None
    contentCalendar: Optional[List[Any]] = None

class ProjectOut(BaseModel):
    id: str
    title: Optional[str] = None
    name: Optional[str] = None
    client_id: str
    category: Optional[str] = "Designing"
    status: Optional[str] = "Planning"
    budget: Optional[float] = 0.0
    deadline: Optional[str] = None
    product_id: Optional[str] = None
    content_calendar: Optional[List[Any]] = None
    model_config = ConfigDict(from_attributes=True)
