from sqlalchemy import String, Text, DateTime, func, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=True)
    contact: Mapped[str] = mapped_column(String(255), nullable=True)
    company: Mapped[str] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Onboarding")
    trafficLight: Mapped[str] = mapped_column(String(50), default="Green", nullable=True)
    advanceRequired: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    billingType: Mapped[str] = mapped_column(String(50), default="Monthly Billing", nullable=True)
    workStartAllowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=True)
    deliveryAllowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=True)
    clientSince: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    projects = relationship("Project", back_populates="client", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="client", cascade="all, delete-orphan")
