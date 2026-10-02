from typing import AsyncGenerator
from sqlalchemy import inspect, text, select, event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Engine configuration
# ---------------------------------------------------------------------------
# On shared hosting (Hostinger etc.), the MySQL server aggressively closes
# idle connections (often <60 s).  pool_pre_ping alone isn't enough because
# aiomysql's ping() itself errors when the underlying TCP socket is already
# half-closed – producing the "RuntimeError: unable to perform operation on
# <TCPTransport>; the handler is closed" cascade that kills every endpoint.
#
# Strategy chosen: keep a *small* pool that gets recycled very aggressively.
#   pool_size=5        – never hold more than 5 live sockets
#   max_overflow=10    – burst headroom
#   pool_recycle=60    – recycle connections every 60 s (before the server
#                        kills them at ~120 s on Hostinger free tier)
#   pool_pre_ping=True – still useful for non-TCP-closed staleness
#   pool_timeout=30    – don't wait forever for a slot
# ---------------------------------------------------------------------------
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_recycle=60,        # ← was 300; must be < Hostinger's wait_timeout
    pool_pre_ping=True,
    pool_timeout=30,
    # Tell MySQL to keep connections alive for 55 s max (< pool_recycle=60).
    # This prevents the server from closing a socket that the pool still
    # holds, which is the root cause of the "TCPTransport handler is closed"
    # RuntimeError on Hostinger shared hosting.
    connect_args={"init_command": "SET SESSION wait_timeout=55"},
)

# ---------------------------------------------------------------------------
# Reconnect-on-error: invalidate the connection so the pool discards it and
# checks out a fresh one on the next request.
# ---------------------------------------------------------------------------
@event.listens_for(engine.sync_engine, "handle_error")
def handle_db_error(context):
    """Invalidate connections that raise OperationalError (lost connection)."""
    from sqlalchemy.exc import OperationalError, DBAPIError
    if context.is_disconnect or isinstance(context.original_exception, (OperationalError, DBAPIError)):
        logger.warning("DB connection error detected – invalidating connection: %s", context.original_exception)
        if context.connection:
            context.connection.invalidate()

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
# Retries once on disconnect errors (stale pool connections on Hostinger).
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    from sqlalchemy.exc import OperationalError, DBAPIError
    for attempt in range(2):
        session = AsyncSessionLocal()
        try:
            yield session
            return
        except (OperationalError, DBAPIError) as exc:
            await session.rollback()
            await session.close()
            if attempt == 0 and getattr(exc, "connection_invalidated", False):
                logger.warning("Stale DB connection – retrying with fresh connection (attempt %d)", attempt + 1)
                continue
            raise
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
        if "jobs" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("jobs")]
            needed_cols = [
                ("description", "VARCHAR(1000) NULL"),
                ("type", "VARCHAR(50) DEFAULT 'Designing'"),
                ("clientId", "VARCHAR(50) NULL"),
                ("projectId", "VARCHAR(50) NULL"),
                ("productId", "VARCHAR(50) NULL"),
                ("printerId", "VARCHAR(50) NULL"),
                ("teamId", "VARCHAR(50) NULL"),
                ("dueDate", "VARCHAR(50) NULL"),
                ("totalAmount", "FLOAT DEFAULT 0.0"),
                ("paidAmount", "FLOAT DEFAULT 0.0"),
                ("paymentStatus", "VARCHAR(50) DEFAULT 'Unpaid'"),
                ("vendorEmailSent", "BOOLEAN DEFAULT FALSE"),
                ("workLink", "VARCHAR(500) NULL"),
                ("workLocation", "VARCHAR(500) NULL"),
                ("estimatedTime", "FLOAT NULL"),
                ("estimatedTimeUnit", "VARCHAR(50) DEFAULT 'Hours'"),
                ("trackedTime", "FLOAT DEFAULT 0.0"),
                ("delayReason", "VARCHAR(500) NULL"),
                ("createdBy", "VARCHAR(100) DEFAULT 'Admin'"),
                ("createdAt", "VARCHAR(50) NULL")
            ]
            for col_name, col_type in needed_cols:
                if col_name not in columns:
                    try:
                        sync_conn.execute(text(f"ALTER TABLE jobs ADD COLUMN `{col_name}` {col_type}"))
                    except Exception as e:
                        print(f"⚠️ Column addition notice for jobs.{col_name}: {e}")
                        
        if "clients" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("clients")]
            needed_cols = [
                ("contact", "VARCHAR(255) NULL"),
                ("trafficLight", "VARCHAR(50) DEFAULT 'Green'"),
                ("advanceRequired", "INT DEFAULT 0"),
                ("billingType", "VARCHAR(50) DEFAULT 'Monthly Billing'"),
                ("workStartAllowed", "BOOLEAN DEFAULT TRUE"),
                ("deliveryAllowed", "BOOLEAN DEFAULT TRUE"),
                ("clientSince", "VARCHAR(50) NULL")
            ]
            for col_name, col_type in needed_cols:
                if col_name not in columns:
                    try:
                        sync_conn.execute(text(f"ALTER TABLE clients ADD COLUMN `{col_name}` {col_type}"))
                    except Exception as e:
                        print(f"⚠️ Column addition notice for clients.{col_name}: {e}")
                        
            # Ensure name can be null
            try:
                sync_conn.execute(text("ALTER TABLE clients MODIFY COLUMN `name` VARCHAR(255) NULL"))
            except Exception as e:
                pass

        if "attendance" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("attendance")]
            needed_att_cols = [
                ("is_late", "BOOLEAN DEFAULT FALSE"),
                ("late_minutes", "INT DEFAULT 0"),
                ("penalty_amount", "FLOAT DEFAULT 0.0"),
                ("warning_note", "VARCHAR(255) NULL")
            ]
            for col_name, col_type in needed_att_cols:
                if col_name not in columns:
                    try:
                        sync_conn.execute(text(f"ALTER TABLE attendance ADD COLUMN `{col_name}` {col_type}"))
                    except Exception as e:
                        print(f"⚠️ Column addition notice for attendance.{col_name}: {e}")

        if "leave_requests" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("leave_requests")]
            needed_leave_cols = [
                ("is_half_day", "BOOLEAN DEFAULT FALSE"),
                ("half_day_session", "VARCHAR(50) NULL")
            ]
            for col_name, col_type in needed_leave_cols:
                if col_name not in columns:
                    try:
                        sync_conn.execute(text(f"ALTER TABLE leave_requests ADD COLUMN `{col_name}` {col_type}"))
                    except Exception as e:
                        print(f"⚠️ Column addition notice for leave_requests.{col_name}: {e}")

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

            # Check if Jobs exist
            job_result = await session.execute(select(models.Job))
            if not job_result.scalars().first():
                j1 = models.Job(
                    id="JOB-2026-001",
                    title="Brand Identity & Logo Design",
                    description="Complete brand identity guidelines, logo vectors, and social media kit",
                    type="Designing",
                    clientId="client-001",
                    teamId="emp-001",
                    dueDate="2026-10-15",
                    totalAmount=15000.0,
                    paidAmount=5000.0,
                    status="In Progress",
                    paymentStatus="Partially Paid",
                    estimatedTime=20.0,
                    estimatedTimeUnit="Hours",
                    trackedTime=8.5,
                    createdBy="Admin",
                    createdAt="2026-10-01"
                )
                j2 = models.Job(
                    id="JOB-2026-002",
                    title="Corporate Brochure Printing",
                    description="1000 copies of 16-page glossy corporate brochure",
                    type="Printing",
                    clientId="client-002",
                    teamId="emp-002",
                    dueDate="2026-10-20",
                    totalAmount=8500.0,
                    paidAmount=0.0,
                    status="Pending",
                    paymentStatus="Unpaid",
                    estimatedTime=15.0,
                    estimatedTimeUnit="Hours",
                    trackedTime=0.0,
                    createdBy="Admin",
                    createdAt="2026-10-01"
                )
                j3 = models.Job(
                    id="JOB-2026-003",
                    title="Website Redesign & UI Assets",
                    description="Full responsive website redesign and promotional banner graphics",
                    type="Des+Print",
                    clientId="client-001",
                    teamId="emp-admin",
                    dueDate="2026-09-28",
                    totalAmount=35000.0,
                    paidAmount=35000.0,
                    status="Completed",
                    paymentStatus="Paid",
                    vendorEmailSent=True,
                    workLink="https://alphacreative.com/preview",
                    workLocation="Google Drive / Assets",
                    estimatedTime=40.0,
                    estimatedTimeUnit="Hours",
                    trackedTime=38.0,
                    createdBy="Admin",
                    createdAt="2026-09-15"
                )
                session.add_all([j1, j2, j3])

            await session.commit()
        except Exception as e:
            print(f"⚠️ Database seed notice: {e}")
            await session.rollback()
