from sqlalchemy import String, Float, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    client_id: Mapped[str] = mapped_column(String(50), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    job_ids: Mapped[dict] = mapped_column(JSON, nullable=True) # Array of job IDs
    custom_items: Mapped[dict] = mapped_column(JSON, nullable=True) # Custom items array
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    tax: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(50), default="Unpaid") # Paid, Unpaid, Overdue
    date: Mapped[str] = mapped_column(String(50), nullable=True)
    due_date: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    client = relationship("Client", back_populates="invoices")
