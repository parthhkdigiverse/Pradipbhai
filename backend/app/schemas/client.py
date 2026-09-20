from typing import Optional
from pydantic import BaseModel, ConfigDict

class ClientBase(BaseModel):
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = "Active"

class ClientCreate(ClientBase):
    id: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None

class ClientOut(ClientBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
