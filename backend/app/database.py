from typing import AsyncGenerator
from sqlalchemy import inspect, text, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Create async engine for MySQL via aiomysql
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=3600
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base ORM model class
class Base(DeclarativeBase):
    pass

# Dependency for FastAPI endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Safe database initialization (Creates missing tables, columns & initial seed data)
async def init_db():
    import app.models as models  # noqa: F401
    
    def check_and_create(sync_conn):
        Base.metadata.create_all(sync_conn)
        inspector = inspect(sync_conn)
        if "staff" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("staff")]
            if "password" not in columns:
                sync_conn.execute(text("ALTER TABLE staff ADD COLUMN password VARCHAR(255) NULL"))
            if "permissions" not in columns:
                sync_conn.execute(text("ALTER TABLE staff ADD COLUMN permissions JSON NULL"))

    async with engine.begin() as conn:
        await conn.run_sync(check_and_create)

    # Initial Database Seeding if tables are empty
    async with AsyncSessionLocal() as session:
        try:
            # Check if Staff exists
            result = await session.execute(select(models.Staff))
            staff_list = result.scalars().all()
            if not staff_list:
                admin_staff = models.Staff(
                    id="emp-admin",
                    name="Admin",
                    role="Admin",
                    email="admin@alphacreative.com",
                    phone="+1 (555) 019-2834",
                    status="Active",
                    join_date="2024-01-01",
                    base_salary=120000.0,
                    password="password"
                )
                emp_jane = models.Staff(
                    id="emp-001",
                    name="Jane Doe",
                    role="Senior Graphic Designer",
                    email="jane@alphacreative.com",
                    phone="+1 (555) 234-5678",
                    status="Active",
                    join_date="2024-02-15",
                    base_salary=65000.0,
                    password="password"
                )
                emp_john = models.Staff(
                    id="emp-002",
                    name="John Smith",
                    role="UI/UX Specialist",
                    email="john@alphacreative.com",
                    phone="+1 (555) 876-5432",
                    status="Active",
                    join_date="2024-03-01",
                    base_salary=70000.0,
                    password="password"
                )
                session.add_all([admin_staff, emp_jane, emp_john])

            # Check if Clients exist
            client_result = await session.execute(select(models.Client))
            if not client_result.scalars().first():
                c1 = models.Client(id="client-001", name="Acme Corp", company="Acme Corporation", email="contact@acme.com", phone="+1 (555) 111-2222", status="Active")
                c2 = models.Client(id="client-002", name="Starlight Inc", company="Starlight Media", email="hello@starlight.io", phone="+1 (555) 333-4444", status="Active")
                session.add_all([c1, c2])

            # Check if Holidays exist
            holiday_result = await session.execute(select(models.Holiday))
            if not holiday_result.scalars().first():
                h1 = models.Holiday(id="hol-001", date="2026-01-01", name="New Year's Day", type="National")
                h2 = models.Holiday(id="hol-002", date="2026-07-04", name="Independence Day", type="National")
                h3 = models.Holiday(id="hol-003", date="2026-12-25", name="Christmas Day", type="National")
                session.add_all([h1, h2, h3])

            await session.commit()
        except Exception as e:
            print(f"⚠️ Database seed notice: {e}")
            await session.rollback()
