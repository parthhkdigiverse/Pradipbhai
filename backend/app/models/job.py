from sqlalchemy import String, Float, Boolean, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(String(1000), nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="Designing")
    clientId: Mapped[str] = mapped_column(String(50), nullable=True)
    projectId: Mapped[str] = mapped_column(String(50), nullable=True)
    productId: Mapped[str] = mapped_column(String(50), nullable=True)
    printerId: Mapped[str] = mapped_column(String(50), nullable=True)
    teamId: Mapped[str] = mapped_column(String(50), nullable=True)
    dueDate: Mapped[str] = mapped_column(String(50), nullable=True)
    totalAmount: Mapped[float] = mapped_column(Float, default=0.0)
    paidAmount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(50), default="Pending")
    paymentStatus: Mapped[str] = mapped_column(String(50), default="Unpaid")
    vendorEmailSent: Mapped[bool] = mapped_column(Boolean, default=False)
    workLink: Mapped[str] = mapped_column(String(500), nullable=True)
    workLocation: Mapped[str] = mapped_column(String(500), nullable=True)
    estimatedTime: Mapped[float] = mapped_column(Float, nullable=True)
    estimatedTimeUnit: Mapped[str] = mapped_column(String(50), default="Hours")
    trackedTime: Mapped[float] = mapped_column(Float, default=0.0)
    delayReason: Mapped[str] = mapped_column(String(500), nullable=True)
    createdBy: Mapped[str] = mapped_column(String(100), default="Admin")
    createdAt: Mapped[str] = mapped_column(String(50), nullable=True)
