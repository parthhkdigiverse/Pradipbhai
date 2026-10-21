from typing import AsyncGenerator
from sqlalchemy import inspect, text, select, event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
import logging

# ---------------------------------------------------------------------------
# Patch aiomysql & SQLAlchemy to suppress harmless uvloop closed transport
# errors when recycling server-closed TCP connections on shared hosting.
# ---------------------------------------------------------------------------
try:
    from sqlalchemy.dialects.mysql.aiomysql import AsyncAdapt_aiomysql_connection
    _orig_terminate = AsyncAdapt_aiomysql_connection.terminate
    def _safe_terminate(self):
        try:
            _orig_terminate(self)
        except (RuntimeError, Exception):
            pass
    AsyncAdapt_aiomysql_connection.terminate = _safe_terminate
except Exception:
    pass

try:
    import aiomysql.connection
    _orig_ensure_closed = aiomysql.connection.Connection.ensure_closed
    async def _safe_ensure_closed(self):
        try:
            await _orig_ensure_closed(self)
        except (RuntimeError, Exception):
            pass
    aiomysql.connection.Connection.ensure_closed = _safe_ensure_closed
except Exception:
    pass

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
    pool_size=3,
    max_overflow=5,
    pool_recycle=300,
    pool_pre_ping=True,
    pool_timeout=15,
    connect_args={"init_command": "SET SESSION wait_timeout=300"},
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
                ("createdAt", "VARCHAR(50) NULL"),
                ("startedAt", "VARCHAR(50) NULL")
            ]
            for col_name, col_type in needed_cols:
                if col_name not in columns:
                    try:
                        sync_conn.execute(text(f"ALTER TABLE jobs ADD COLUMN `{col_name}` {col_type}"))
                    except Exception as e:
                        print(f"⚠️ Column addition notice for jobs.{col_name}: {e}")
            # Drop description column if it still exists (no longer used)
            if "description" in columns:
                try:
                    sync_conn.execute(text("ALTER TABLE jobs DROP COLUMN `description`"))
                    print("✅ Dropped deprecated jobs.description column")
                except Exception as e:
                    print(f"⚠️ Could not drop jobs.description: {e}")
                    
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

        if "staff" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("staff")]
            needed_staff_cols = [
                ("office_start_time", "VARCHAR(50) NULL"),
                ("office_end_time", "VARCHAR(50) NULL")
            ]
            for col_name, col_type in needed_staff_cols:
                if col_name not in columns:
                    try:
                        sync_conn.execute(text(f"ALTER TABLE staff ADD COLUMN `{col_name}` {col_type}"))
                    except Exception as e:
                        print(f"⚠️ Column addition notice for staff.{col_name}: {e}")

        if "daily_progress" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("daily_progress")]
            needed_dp_cols = [
                ("role", "VARCHAR(100) NULL"),
                ("submitted_at", "VARCHAR(50) NULL"),
                ("tasks_done", "JSON NULL"),
                ("tasks_pending", "JSON NULL"),
                ("hours_logged", "FLOAT DEFAULT 0.0"),
                ("verification_status", "VARCHAR(50) DEFAULT 'Pending'"),
                ("rating", "INT DEFAULT 0"),
                ("manager_remarks", "VARCHAR(500) NULL"),
                ("verified_by", "VARCHAR(255) NULL"),
                ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")
            ]
            for col_name, col_type in needed_dp_cols:
                if col_name not in columns:
                    try:
                        sync_conn.execute(text(f"ALTER TABLE daily_progress ADD COLUMN `{col_name}` {col_type}"))
                    except Exception as e:
                        print(f"⚠️ Column addition notice for daily_progress.{col_name}: {e}")

        if "invoices" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("invoices")]
            needed_inv_cols = [
                ("invoice_type", "VARCHAR(50) DEFAULT 'Tax'"),
                ("tax_rate", "VARCHAR(10) DEFAULT '18'")
            ]
            for col_name, col_type in needed_inv_cols:
                if col_name not in columns:
                    try:
                        sync_conn.execute(text(f"ALTER TABLE invoices ADD COLUMN `{col_name}` {col_type}"))
                    except Exception as e:
                        print(f"⚠️ Column addition notice for invoices.{col_name}: {e}")

        if "chat_messages" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("chat_messages")]
            needed_chat_cols = [
                ("attachment", "JSON NULL"),
                ("reply_to", "JSON NULL"),
                ("reactions", "JSON NULL"),
                ("is_starred", "BOOLEAN DEFAULT FALSE"),
                ("is_forwarded", "BOOLEAN DEFAULT FALSE"),
                ("is_edited", "BOOLEAN DEFAULT FALSE"),
                ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")
            ]
            for col_name, col_type in needed_chat_cols:
                if col_name not in columns:
                    try:
                        sync_conn.execute(text(f"ALTER TABLE chat_messages ADD COLUMN `{col_name}` {col_type}"))
                    except Exception as e:
                        print(f"⚠️ Column addition notice for chat_messages.{col_name}: {e}")
            try:
                # Force resize sender column to support longer UUIDs or Emails
                sync_conn.execute(text("ALTER TABLE chat_messages MODIFY COLUMN sender VARCHAR(100) NOT NULL"))
            except Exception as e:
                print(f"⚠️ Column modification notice for chat_messages.sender: {e}")

        if "field_duties" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("field_duties")]
            if "auto_logout" not in columns:
                try:
                    sync_conn.execute(text("ALTER TABLE field_duties ADD COLUMN `auto_logout` BOOLEAN DEFAULT TRUE"))
                except Exception as e:
                    print(f"⚠️ Column addition notice for field_duties.auto_logout: {e}")

        if "payroll_records" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("payroll_records")]
            if "deduction_reason" not in columns:
                try:
                    sync_conn.execute(text("ALTER TABLE payroll_records ADD COLUMN `deduction_reason` VARCHAR(500) NULL"))
                except Exception as e:
                    print(f"⚠️ Column addition notice for payroll_records.deduction_reason: {e}")

        if "projects" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("projects")]
            needed_proj_cols = [
                ("name", "VARCHAR(255) NULL"),
                ("category", "VARCHAR(50) DEFAULT 'Designing'"),
                ("product_id", "VARCHAR(50) NULL"),
                ("content_calendar", "JSON NULL")
            ]
            for col_name, col_type in needed_proj_cols:
                if col_name not in columns:
                    try:
                        sync_conn.execute(text(f"ALTER TABLE projects ADD COLUMN `{col_name}` {col_type}"))
                    except Exception as e:
                        print(f"⚠️ Column addition notice for projects.{col_name}: {e}")

    async with engine.begin() as conn:
        await conn.run_sync(check_and_create)

    # Initial Database Seeding if tables are empty
    async with AsyncSessionLocal() as session:
        try:
            # Ensure Default Admin exists if Staff table is empty
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
                session.add(admin_staff)

            # Check if Holidays exist
            holiday_result = await session.execute(select(models.Holiday))
            if not holiday_result.scalars().first():
                h1 = models.Holiday(id="hol-001", date="2026-01-01", name="New Year's Day", type="National")
                h2 = models.Holiday(id="hol-002", date="2026-07-04", name="Independence Day", type="National")
                h3 = models.Holiday(id="hol-003", date="2026-12-25", name="Christmas Day", type="National")
                session.add_all([h1, h2, h3])

            # Check if FieldDuty activities exist


            fd_result = await session.execute(select(models.FieldDuty))
            if not fd_result.scalars().first():
                fd1 = models.FieldDuty(id="activity-courier-drop", name="📦 Courier Drop-off (Field Duty)")
                fd2 = models.FieldDuty(id="activity-courier-collect", name="📦 Courier Collection / Pickup")
                fd3 = models.FieldDuty(id="activity-outdoor-visit", name="🚗 Client Visit / Outdoor Duty")
                session.add_all([fd1, fd2, fd3])

            await session.commit()
        except Exception as e:
            print(f"⚠️ Database seed notice: {e}")
            await session.rollback()
