import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, field_validator

class LeadBase(BaseModel):
    company: str
    contact: Optional[str] = None
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

    @field_validator('follow_ups')
    @classmethod
    def validate_follow_ups(cls, v: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        if v:
            today_str = datetime.now().date().isoformat()
            for item in v:
                if isinstance(item, dict) and item.get('date'):
                    date_val = str(item['date']).split('T')[0]
                    if date_val > today_str:
                        raise ValueError(f"Upcoming date not allowed for follow-ups: {date_val}")
        return v

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

    @field_validator('follow_ups')
    @classmethod
    def validate_follow_ups(cls, v: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        if v:
            today_str = datetime.now().date().isoformat()
            for item in v:
                if isinstance(item, dict) and item.get('date'):
                    date_val = str(item['date']).split('T')[0]
                    if date_val > today_str:
                        raise ValueError(f"Upcoming date not allowed for follow-ups: {date_val}")
        return v

class LeadOut(LeadBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
