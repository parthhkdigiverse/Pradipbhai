from pydantic import BaseModel, ConfigDict
from typing import Optional

class FieldDutyBase(BaseModel):
    name: str
    auto_logout: Optional[bool] = True

class FieldDutyCreate(FieldDutyBase):
    id: Optional[str] = None

class FieldDutyOut(FieldDutyBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
