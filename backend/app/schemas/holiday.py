from typing import Optional
from pydantic import BaseModel, ConfigDict

class HolidayBase(BaseModel):
    date: str
    name: str
    type: Optional[str] = "National"

class HolidayCreate(HolidayBase):
    id: Optional[str] = None

class HolidayOut(HolidayBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
