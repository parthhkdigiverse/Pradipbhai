from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db

# Import API Routers
from app.api.clients import router as clients_router
from app.api.jobs import router as jobs_router
from app.api.invoices import router as invoices_router
from app.api.payroll import router as payroll_router
from app.api.daily_progress import router as daily_progress_router
from app.api.leads import router as leads_router
from app.api.staff import router as staff_router
from app.api.attendance import router as attendance_router
from app.api.leaves import router as leaves_router
from app.api.holidays import router as holidays_router
from app.api.worklogs import router as worklogs_router
from app.api.vendors import router as vendors_router
from app.api.auth import router as auth_router
from app.api.permissions import router as permissions_router
from app.api.restrictions import router as restrictions_router
from app.api.chat import router as chat_router

# Lifespan event handler for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:
        print(f"⚠️ Database initialization notice: {e}")
    yield

app = FastAPI(
    title="Alpha Creative CRM/ERP API",
    description="FastAPI Backend for Alpha Creative CRM with MySQL & Real-time Chat",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.deps import get_current_user

# Include Routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(clients_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(jobs_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(invoices_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(payroll_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(daily_progress_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(leads_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(staff_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(attendance_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(leaves_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(holidays_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(worklogs_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(vendors_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(permissions_router, prefix="/api/permissions", dependencies=[Depends(get_current_user)])
app.include_router(restrictions_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(chat_router, prefix="/api", dependencies=[Depends(get_current_user)])

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "app": "Alpha Creative CRM/ERP API",
        "database": settings.DB_NAME,
        "host": settings.DB_HOST
    }
