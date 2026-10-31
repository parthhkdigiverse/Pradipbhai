#!/usr/bin/env python3
"""
Master Build Script for Alpha Creative CRM Electron Desktop Application
-----------------------------------------------------------------------
Steps:
  1. Build React Frontend SPA (Vite -> frontend/dist)
  2. Bundle Python FastAPI backend into standalone binary (dist/api/AlphaCreativeCRM)
  3. Run electron-builder to generate Windows NSIS Setup (.exe) and Portable (.exe)
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent

def run_cmd(cmd, cwd=None, description=""):
    print(f"\n👉 {description}...")
    print(f"   Command: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    res = subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str))
    if res.returncode != 0:
        print(f"❌ Failed: {description} (Exit Code: {res.returncode})")
        sys.exit(res.returncode)
    print(f"✅ Finished: {description}")

def main():
    print("=" * 70)
    print("   ⚡ ALPHA CREATIVE CRM - ELECTRON DESKTOP BUILD PIPELINE")
    print("=" * 70)

    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_dir = ROOT_DIR / "frontend"

    # Step 1: Build React Frontend
    print("\n📦 [1/3] Compiling React Frontend (Vite)...")
    if not (frontend_dir / "node_modules").exists():
        run_cmd([npm_cmd, "install"], cwd=frontend_dir, description="Installing frontend packages")
    run_cmd([npm_cmd, "run", "build"], cwd=frontend_dir, description="Building frontend production assets")

    dist_index = frontend_dir / "dist" / "index.html"
    if not dist_index.exists():
        print(f"❌ Error: {dist_index} missing. Frontend build failed.")
        sys.exit(1)

    # Step 2: Build Backend Binary with PyInstaller
    print("\n🐍 [2/3] Bundling Python Backend with PyInstaller...")
    api_dist = ROOT_DIR / "dist" / "api"
    api_dist.mkdir(parents=True, exist_ok=True)

    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "AlphaCreativeCRM.spec",
        "--distpath", str(api_dist),
        "--clean", "--noconfirm"
    ]
    run_cmd(pyinstaller_cmd, cwd=ROOT_DIR, description="Packaging backend executable into dist/api")

    # Step 3: Run Electron-Builder
    print("\n⚡ [3/3] Packaging Electron Desktop Installer with electron-builder...")
    target_flag = "--win" if os.name == "nt" else "--mac"
    if len(sys.argv) > 1:
        target_flag = sys.argv[1]

    electron_builder_cmd = [npm_cmd, "run", "dist", "--", target_flag]
    run_cmd(electron_builder_cmd, cwd=ROOT_DIR, description="Generating Electron Desktop distribution")

    print("\n" + "=" * 70)
    print("🎉 ELECTRON BUILD COMPLETED SUCCESSFULLY!")
    print(f"📁 Output Directory: {ROOT_DIR / 'dist-electron'}")
    print("=" * 70)

if __name__ == "__main__":
    main()
