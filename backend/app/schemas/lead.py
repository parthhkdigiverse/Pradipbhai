from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class LeadBase(BaseModel):
    company: str
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = "Website"
    category: Optional[str] = "Hot Lead"
    status: Optional[str] = "Lead"
    priority: Optional[str] = "High"
    is_hot: Optional[bool] = False
    expected_income: Optional[float] = 0.0
    created_by_user_name: Optional[str] = "Admin"
    date: Optional[str] = None
    follow_ups: Optional[List[Dict[str, Any]]] = []

class LeadCreate(LeadBase):
    id: Optional[str] = None

class LeadUpdate(BaseModel):
    company: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    is_hot: Optional[bool] = None
    expected_income: Optional[float] = None
    created_by_user_name: Optional[str] = None
    date: Optional[str] = None
    follow_ups: Optional[List[Dict[str, Any]]] = None

class LeadOut(LeadBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
