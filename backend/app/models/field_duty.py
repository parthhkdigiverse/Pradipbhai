from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class FieldDuty(Base):
    __tablename__ = "field_duties"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    auto_logout: Mapped[bool] = mapped_column(Boolean, default=True)
