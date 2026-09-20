import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceOut
from app.cache import get_cache, set_cache, invalidate_cache

router = APIRouter(prefix="/invoices", tags=["Invoices"])
CACHE_KEY = "cache:invoices:all"

@router.get("", response_model=List[InvoiceOut])
async def get_invoices(db: AsyncSession = Depends(get_db)):
    cached = await get_cache(CACHE_KEY)
    if cached is not None:
        return cached

    result = await db.execute(select(Invoice))
    invoices = result.scalars().all()
    
    inv_dict = [InvoiceOut.model_validate(inv).model_dump() for inv in invoices]
    await set_cache(CACHE_KEY, inv_dict, expire_seconds=300)
    
    return invoices

@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
async def create_invoice(invoice_in: InvoiceCreate, db: AsyncSession = Depends(get_db)):
    invoice_id = invoice_in.id or f"inv-{uuid.uuid4().hex[:8]}"
    invoice = Invoice(
        id=invoice_id,
        invoice_number=invoice_in.invoice_number,
        client_id=invoice_in.client_id,
        job_ids=invoice_in.job_ids or [],
        custom_items=invoice_in.custom_items or [],
        subtotal=invoice_in.subtotal or 0.0,
        tax=invoice_in.tax or 0.0,
        total=invoice_in.total or 0.0,
        status=invoice_in.status or "Unpaid",
        date=invoice_in.date,
        due_date=invoice_in.due_date
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    await invalidate_cache(CACHE_KEY)
    return invoice

@router.put("/{invoice_id}", response_model=InvoiceOut)
async def update_invoice(invoice_id: str, invoice_in: InvoiceUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    for field, val in invoice_in.model_dump(exclude_unset=True).items():
        setattr(invoice, field, val)
        
    await db.commit()
    await db.refresh(invoice)
    await invalidate_cache(CACHE_KEY)
    return invoice

@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    await db.delete(invoice)
    await db.commit()
    await invalidate_cache(CACHE_KEY)
