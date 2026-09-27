from typing import Optional
from pydantic import BaseModel, ConfigDict

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: Optional[str] = "Designing"
    price: Optional[float] = None
    estimated_time: Optional[float] = None
    estimated_time_unit: Optional[str] = "Hours"

class ProductCreate(ProductBase):
    id: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    price: Optional[float] = None
    estimated_time: Optional[float] = None
    estimated_time_unit: Optional[str] = None

class ProductOut(ProductBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
