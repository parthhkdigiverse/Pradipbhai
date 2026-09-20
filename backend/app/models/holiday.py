from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Holiday(Base):
    __tablename__ = "holidays"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    date: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="National") # National, Regional, Company
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
