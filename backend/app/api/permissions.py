from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.permission import RolePermission

router = APIRouter()

DEFAULT_PERMISSIONS: Dict[str, Dict[str, bool]] = {
    'Admin': {
        'View Dashboard': True, 'View Metrics': True, 'Export Data': True,
        'View Projects': True, 'Create/Edit Projects': True,
        'View Jobs': True, 'Create Job': True, 'Edit Job': True, 'Delete Job': True,
        'View Catalog': True, 'Manage Products': True,
        'View Vendors': True, 'Manage Vendors': True,
        'View Staff': True, 'Create/Edit Staff': True, 'Delete Staff': True,
        'View Attendance': True, 'Punch In/Out': True,
        'View Work Logs': True, 'Add Work Log': True,
        'View Daily Progress': True, 'Verify & Rate Reports': True,
        'View Payroll': True, 'Manage Payroll': True,
        'View Leaves': True, 'Apply Leave': True, 'Approve/Reject Leaves': True,
        'View Holidays': True, 'Manage Holidays': True,
        'View Clients': True, 'Create/Edit Clients': True, 'Delete Clients': True,
        'View Leads': True, 'Create/Edit Leads': True, 'Delete Leads': True,
        'View Social Media': True, 'Manage Social Posts': True,
        'View Invoices': True, 'Create/Edit Invoices': True, 'Delete Invoices': True,
        'Access Chat': True,
        'View Reports': True, 'Export Reports': True,
        'View Security': True, 'Edit Permissions': True,
        'View Settings': True, 'Change System Settings': True
    },
    'Manager': {
        'View Dashboard': True, 'View Metrics': True, 'Export Data': True,
        'View Projects': True, 'Create/Edit Projects': True,
        'View Jobs': True, 'Create Job': True, 'Edit Job': True, 'Delete Job': False,
        'View Catalog': True, 'Manage Products': True,
        'View Vendors': True, 'Manage Vendors': True,
        'View Staff': True, 'Create/Edit Staff': True, 'Delete Staff': False,
        'View Attendance': True, 'Punch In/Out': True,
        'View Work Logs': True, 'Add Work Log': True,
        'View Daily Progress': True, 'Verify & Rate Reports': True,
        'View Payroll': True, 'Manage Payroll': True,
        'View Leaves': True, 'Apply Leave': True, 'Approve/Reject Leaves': True,
        'View Holidays': True, 'Manage Holidays': True,
        'View Clients': True, 'Create/Edit Clients': True, 'Delete Clients': False,
        'View Leads': True, 'Create/Edit Leads': True, 'Delete Leads': False,
        'View Social Media': True, 'Manage Social Posts': True,
        'View Invoices': True, 'Create/Edit Invoices': True, 'Delete Invoices': False,
        'Access Chat': True,
        'View Reports': True, 'Export Reports': True,
        'View Security': False, 'Edit Permissions': False,
        'View Settings': False, 'Change System Settings': False
    },
    'Employee': {
        'View Dashboard': True, 'View Metrics': True, 'Export Data': False,
        'View Projects': True, 'Create/Edit Projects': False,
        'View Jobs': True, 'Create Job': False, 'Edit Job': False, 'Delete Job': False,
        'View Catalog': True, 'Manage Products': False,
        'View Vendors': False, 'Manage Vendors': False,
        'View Staff': False, 'Create/Edit Staff': False, 'Delete Staff': False,
        'View Attendance': True, 'Punch In/Out': True,
        'View Work Logs': True, 'Add Work Log': True,
        'View Daily Progress': True, 'Verify & Rate Reports': False,
        'View Payroll': False, 'Manage Payroll': False,
        'View Leaves': True, 'Apply Leave': True, 'Approve/Reject Leaves': False,
        'View Holidays': True, 'Manage Holidays': False,
        'View Clients': False, 'Create/Edit Clients': False, 'Delete Clients': False,
        'View Leads': False, 'Create/Edit Leads': False, 'Delete Leads': False,
        'View Social Media': False, 'Manage Social Posts': False,
        'View Invoices': False, 'Create/Edit Invoices': False, 'Delete Invoices': False,
        'Access Chat': True,
        'View Reports': False, 'Export Reports': False,
        'View Security': False, 'Edit Permissions': False,
        'View Settings': False, 'Change System Settings': False
    }
}

class TogglePermissionRequest(BaseModel):
    role: str
    action: str
    allowed: Optional[bool] = None

@router.get("")
async def get_permissions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RolePermission))
    records = result.scalars().all()
    
    # Start with deep copy of defaults
    output = {
        role: dict(actions) for role, actions in DEFAULT_PERMISSIONS.items()
    }
    
    # Override with database records
    for item in records:
        if item.role not in output:
            output[item.role] = {}
        output[item.role][item.action] = item.allowed
        
    return output

@router.post("/toggle")
async def toggle_permission(payload: TogglePermissionRequest, db: AsyncSession = Depends(get_db)):
    perm_id = f"perm-{payload.role}-{payload.action.replace(' ', '-').replace('/', '-')}"
    
    result = await db.execute(select(RolePermission).where(RolePermission.id == perm_id))
    record = result.scalars().first()
    
    if record:
        new_val = not record.allowed if payload.allowed is None else payload.allowed
        record.allowed = new_val
    else:
        current_default = DEFAULT_PERMISSIONS.get(payload.role, {}).get(payload.action, False)
        new_val = not current_default if payload.allowed is None else payload.allowed
        record = RolePermission(
            id=perm_id,
            role=payload.role,
            action=payload.action,
            allowed=new_val
        )
        db.add(record)
        
    await db.commit()
    
    # Return updated full permissions
    return await get_permissions(db)
