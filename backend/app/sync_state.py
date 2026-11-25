import time
from typing import Dict, Any

# In-Memory RAM Revision State (Zero Database queries, 0 DB connection overhead)
_SYNC_STATE: Dict[str, Any] = {
    "version": 1,
    "updated_at": int(time.time()),
    "modules": {
        "jobs": 1,
        "clients": 1,
        "attendance": 1,
        "invoices": 1,
        "staff": 1,
        "leaves": 1,
        "payroll": 1,
        "worklogs": 1,
        "daily_progress": 1
    }
}

def get_sync_version() -> Dict[str, Any]:
    """Returns the current in-memory revision state from RAM."""
    return _SYNC_STATE

def bump_sync_version(module: str = None) -> int:
    """Increments the in-memory version counter whenever any data is created/updated/deleted."""
    _SYNC_STATE["version"] += 1
    _SYNC_STATE["updated_at"] = int(time.time())
    if module and module in _SYNC_STATE["modules"]:
        _SYNC_STATE["modules"][module] += 1
    return _SYNC_STATE["version"]

