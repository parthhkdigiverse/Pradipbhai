from typing import Optional
from pydantic import BaseModel, ConfigDict

class VendorBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

class VendorCreate(VendorBase):
    id: Optional[str] = None

class VendorOut(VendorBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
