import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut
from app.cache import get_cache, set_cache, invalidate_cache

router = APIRouter(prefix="/clients", tags=["Clients"])
CACHE_KEY = "cache:clients:all"

@router.get("", response_model=List[ClientOut])
async def get_clients(db: AsyncSession = Depends(get_db)):
    cached = await get_cache(CACHE_KEY)
    if cached is not None:
        return cached

    result = await db.execute(select(Client))
    clients = result.scalars().all()
    
    clients_dict = [ClientOut.model_validate(c).model_dump() for c in clients]
    await set_cache(CACHE_KEY, clients_dict, expire_seconds=300)
    
    return clients

@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(client_in: ClientCreate, db: AsyncSession = Depends(get_db)):
    client_id = client_in.id or f"client-{uuid.uuid4().hex[:8]}"
    client = Client(
        id=client_id,
        name=client_in.name,
        company=client_in.company,
        email=client_in.email,
        phone=client_in.phone,
        status=client_in.status or "Active"
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    await invalidate_cache(CACHE_KEY)
    return client

@router.put("/{client_id}", response_model=ClientOut)
async def update_client(client_id: str, client_in: ClientUpdate, db: AsyncSession = Depends(get_db)):
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
async def delete_client(client_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
    await db.commit()
    await invalidate_cache(CACHE_KEY)
