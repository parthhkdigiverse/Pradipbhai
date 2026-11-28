import math
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.client import Client
from app.models.staff import Staff
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut
from app.cache import get_cache, set_cache, invalidate_cache
from app.api.deps import require_permission

router = APIRouter(prefix="/clients", tags=["Clients"])
CACHE_KEY = "cache:clients:all"

@router.get("", response_model=List[ClientOut])
async def get_clients(
    skip: int = Query(0, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=10000),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"{CACHE_KEY}:{skip}:{limit if limit is not None else 'all'}"
    cached = await get_cache(cache_key)
    if cached is not None:
        return cached

    stmt = select(Client).order_by(Client.created_at.desc(), Client.id).offset(skip)
    if limit is not None:
        stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    clients = result.scalars().all()

    clients_dict = [ClientOut.model_validate(c).model_dump() for c in clients]
    await set_cache(cache_key, clients_dict, expire_seconds=300)

    return clients


@router.get("/paginated")
async def get_clients_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    norm_search = (search or "").strip().lower()
    norm_status = (status_filter or "").strip()
    cache_key = f"{CACHE_KEY}:paginated:{page}:{page_size}:{norm_status}:{norm_search}"
    cached = await get_cache(cache_key)
    if cached is not None:
        return cached

    filters = []
    if norm_search:
        pattern = f"%{norm_search}%"
        filters.append(
            or_(
                func.lower(func.coalesce(Client.company, "")).like(pattern),
                func.lower(func.coalesce(Client.contact, "")).like(pattern),
                func.lower(func.coalesce(Client.name, "")).like(pattern),
                func.lower(func.coalesce(Client.email, "")).like(pattern),
                func.lower(func.coalesce(Client.phone, "")).like(pattern),
            )
        )
    if norm_status and norm_status.lower() != "all":
        filters.append(Client.status == norm_status)

    count_stmt = select(func.count(Client.id))
    data_stmt = select(Client).order_by(Client.created_at.desc(), Client.id)
    if filters:
        count_stmt = count_stmt.where(*filters)
        data_stmt = data_stmt.where(*filters)

    total_res = await db.execute(count_stmt)
    total = int(total_res.scalar_one_or_none() or 0)
    total_pages = max(1, math.ceil(total / page_size))
    safe_page = min(page, total_pages)
    offset = (safe_page - 1) * page_size

    rows_res = await db.execute(data_stmt.offset(offset).limit(page_size))
    items = [ClientOut.model_validate(c).model_dump() for c in rows_res.scalars().all()]

    payload = {
        "items": items,
        "total": total,
        "page": safe_page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
    await set_cache(cache_key, payload, expire_seconds=300)
    return payload

@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_in: ClientCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("Create/Edit Clients")),
):
    client_id = client_in.id or f"client-{uuid.uuid4().hex[:8]}"
    client_data = client_in.model_dump(exclude={"id"})
    if not client_data.get("name"):
        client_data["name"] = client_data.get("company") or client_data.get("contact") or "Unknown"
    if not client_data.get("company"):
        client_data["company"] = client_data.get("name") or client_data.get("contact") or "Unknown"
    client = Client(
        id=client_id,
        **client_data
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    await invalidate_cache(CACHE_KEY)
    return client

@router.put("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: str,
    client_in: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("Create/Edit Clients")),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    for field, val in client_in.model_dump(exclude_unset=True).items():
        setattr(client, field, val)
        
    await db.commit()
    await db.refresh(client)
    await invalidate_cache(CACHE_KEY)
    return client

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_permission("Delete Clients")),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
    await db.commit()
    await invalidate_cache(CACHE_KEY)
