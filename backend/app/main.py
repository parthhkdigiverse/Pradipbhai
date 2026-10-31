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
from app.api.products import router as products_router
from app.api.auth import router as auth_router
from app.api.permissions import router as permissions_router
from app.api.restrictions import router as restrictions_router
from app.api.chat import router as chat_router, ws_router as chat_ws_router
from app.api.field_duties import router as field_duties_router
from app.api.projects import router as projects_router
from app.api.employee_of_month import router as employee_of_month_router

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

# CORS Configuration - Wildcard (JWT Bearer tokens don't need allow_credentials=True)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
app.include_router(products_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(permissions_router, prefix="/api/permissions", dependencies=[Depends(get_current_user)])
app.include_router(restrictions_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(chat_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(chat_ws_router, prefix="/api") # No HTTPBearer auth dependency for WebSocket
app.include_router(field_duties_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(projects_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(employee_of_month_router, prefix="/api", dependencies=[Depends(get_current_user)])

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "app": "Alpha Creative CRM/ERP API",
        "database": settings.DB_NAME,
        "host": settings.DB_HOST
    }

# -------------------------------------------------------------
# Production Frontend SPA Static Serving (for Electron / Monolith)
# -------------------------------------------------------------
import sys
from pathlib import Path
from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

def get_frontend_dist() -> Path | None:
    candidates = []
    if getattr(sys, "frozen", False):
        if hasattr(sys, "_MEIPASS"):
            candidates.append(Path(sys._MEIPASS) / "frontend" / "dist")
        candidates.append(Path(sys.executable).resolve().parent / "dist")
        candidates.append(Path(sys.executable).resolve().parent / "frontend" / "dist")
        candidates.append(Path(sys.executable).resolve().parent.parent / "frontend" / "dist")
    else:
        candidates.append(Path(__file__).resolve().parent.parent.parent / "frontend" / "dist")

    for candidate in candidates:
        if candidate.exists() and (candidate / "index.html").exists():
            return candidate
    return None

frontend_dist = get_frontend_dist()

if frontend_dist:
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_frontend(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        
        target_file = frontend_dist / full_path
        if full_path and target_file.is_file():
            return FileResponse(target_file)
        
        index_file = frontend_dist / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Index not found")
