from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class InvoiceBase(BaseModel):
    invoice_number: str
    client_id: str
    job_ids: Optional[List[str]] = []
    custom_items: Optional[List[Dict[str, Any]]] = []
    subtotal: Optional[float] = 0.0
    tax: Optional[float] = 0.0
    total: Optional[float] = 0.0
    status: Optional[str] = "Unpaid"
    date: Optional[str] = None
    due_date: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    id: Optional[str] = None

class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    client_id: Optional[str] = None
    job_ids: Optional[List[str]] = None
    custom_items: Optional[List[Dict[str, Any]]] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    status: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None

class InvoiceOut(InvoiceBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
