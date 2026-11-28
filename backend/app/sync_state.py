import time
from typing import Dict, Any

# In-Memory RAM Revision State (Zero Database queries, 0 DB connection overhead)
_SYNC_STATE: Dict[str, Any] = {
    "version": 1,
    "updated_at": int(time.time()),
    "modules": {
        "jobs": 1,
        "clients": 1,
        "leads": 1,
        "projects": 1,
        "attendance": 1,
        "invoices": 1,
        "staff": 1,
        "leaves": 1,
        "holidays": 1,
        "payroll": 1,
        "worklogs": 1,
        "daily-progress": 1,
        "vendors": 1,
        "products": 1,
        "permissions": 1,
        "restrictions": 1,
        "field-duties": 1,
        "employee-of-month": 1,
    }
}

def get_sync_version() -> Dict[str, Any]:
    """Returns the current in-memory revision state from RAM."""
    return _SYNC_STATE

def bump_sync_version(module: str = None) -> int:
    """Increments the in-memory version counter whenever any data is created/updated/deleted."""
    _SYNC_STATE["version"] += 1
    _SYNC_STATE["updated_at"] = int(time.time())
    if module:
        normalized = module.strip().lower().replace("_", "-")
        _SYNC_STATE["modules"][normalized] = _SYNC_STATE["modules"].get(normalized, 1) + 1
    return _SYNC_STATE["version"]

