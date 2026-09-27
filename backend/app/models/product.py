from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    type: Mapped[str] = mapped_column(String(100), default="Designing")
    price: Mapped[float] = mapped_column(Float, nullable=True)
    estimated_time: Mapped[float] = mapped_column(Float, nullable=True)
    estimated_time_unit: Mapped[str] = mapped_column(String(50), default="Hours")
