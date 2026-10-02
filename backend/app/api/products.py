from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.product import Product

router = APIRouter(prefix="/products", tags=["Products"])

class ProductBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str = "Designing"
    price: Optional[float] = None
    estimated_time: Optional[float] = None
    estimated_time_unit: Optional[str] = "Hours"

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    price: Optional[float] = None
    estimated_time: Optional[float] = None
    estimated_time_unit: Optional[str] = None

class ProductOut(ProductBase):
    class Config:
        from_attributes = True


@router.get("", response_model=List[ProductOut])
async def get_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product))
    products = result.scalars().all()
    return products


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Product).where(Product.id == product.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Product ID already exists")
    
    # Check duplicate name + type (case-insensitive name match)
    duplicate = await db.execute(
        select(Product).where(
            func.lower(Product.name) == product.name.strip().lower(),
            Product.type == product.type
        )
    )
    if duplicate.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"A product named '{product.name.strip()}' with type '{product.type}' already exists."
        )

    db_product = Product(**product.model_dump())
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product

@router.put("/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, product_data: ProductUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    db_product = result.scalar_one_or_none()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    new_name = product_data.name.strip() if product_data.name is not None else db_product.name
    new_type = product_data.type if product_data.type is not None else db_product.type

    # Check duplicate name + type for other products
    duplicate = await db.execute(
        select(Product).where(
            Product.id != product_id,
            func.lower(Product.name) == new_name.lower(),
            Product.type == new_type
        )
    )
    if duplicate.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"A product named '{new_name}' with type '{new_type}' already exists."
        )

    for key, value in product_data.model_dump(exclude_unset=True).items():
        setattr(db_product, key, value)
    
    await db.commit()
    await db.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    db_product = result.scalar_one_or_none()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.delete(db_product)
    await db.commit()
    return {"message": "Product deleted successfully"}
