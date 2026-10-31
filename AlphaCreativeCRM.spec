# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

block_cipher = None
ROOT_DIR = Path.cwd()

hidden_imports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.loops.asyncio',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.protocols.websockets.websockets_impl',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    'aiomysql',
    'aiomysql.sa',
    'sqlalchemy.dialects.mysql',
    'sqlalchemy.dialects.mysql.aiomysql',
    'sqlalchemy.ext.asyncio',
    'passlib.handlers.bcrypt',
    'bcrypt',
    'jose',
    'cryptography',
    'pydantic',
    'pydantic_settings',
    'aiofiles',
    'redis',
    'redis.asyncio',
    'greenlet',
    'multipart',
]

hidden_imports += collect_submodules('backend.app')
hidden_imports += collect_submodules('app')

datas = [
    ('frontend/dist', 'frontend/dist'),
    ('.env.example', '.'),
    ('backend', 'backend'),
]

datas += collect_data_files('passlib', include_py_files=True)

a = Analysis(
    ['desktop_launcher.py'],
    pathex=[str(ROOT_DIR), str(ROOT_DIR / 'backend')],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'scipy', 'numpy'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='AlphaCreativeCRM',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Hidden console for Electron!
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
