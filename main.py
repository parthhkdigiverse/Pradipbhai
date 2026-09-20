import os
import sys
import subprocess
import signal
import time
from pathlib import Path

# Path to root directory and .env
ROOT_DIR = Path(__file__).resolve().parent
ENV_FILE = ROOT_DIR / ".env"

# Fallback helper to load .env without requiring external libraries
def load_root_env():
    if ENV_FILE.exists():
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'").strip('"')
                    if key not in os.environ:
                        os.environ[key] = val

load_root_env()

BACKEND_PORT = os.getenv("BACKEND_PORT", "8000")
FRONTEND_PORT = os.getenv("FRONTEND_PORT", "5173")

processes = []

def signal_handler(sig, frame):
    print("\n\n🛑 Shutting down both Frontend and Backend servers...")
    for proc in processes:
        if proc.poll() is None:
            try:
                proc.terminate()
            except Exception:
                pass
    sys.exit(0)

# Register Ctrl+C (SIGINT) and SIGTERM handler
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def main():
    print("=" * 65)
    print("🚀 STARTING ALPHA CREATIVE CRM/ERP (FULL-STACK MONOREPO)")
    print("=" * 65)
    print(f"🔹 Backend Port:  {BACKEND_PORT}")
    print(f"🔹 Frontend Port: {FRONTEND_PORT}")
    print(f"🔹 Workspace:     {ROOT_DIR}")
    print("=" * 65)

    # Detect .venv python executable if available
    venv_python = ROOT_DIR / ".venv" / ("Scripts" if os.name == "nt" else "bin") / ("python.exe" if os.name == "nt" else "python")
    if venv_python.exists():
        python_cmd = str(venv_python)
        print(f"🐍 Using Virtual Environment: {venv_python}")
    else:
        python_cmd = sys.executable
        print(f"🐍 Using System Python: {python_cmd}")

    # 1. Start FastAPI Backend Process
    backend_dir = ROOT_DIR / "backend"
    print("\n📦 Launching FastAPI Backend...")
    
    backend_proc = subprocess.Popen(
        [python_cmd, "run.py"],
        cwd=backend_dir,
        env=os.environ.copy()
    )
    processes.append(backend_proc)

    time.sleep(1)

    # 2. Start Vite Frontend Process
    frontend_dir = ROOT_DIR / "frontend"
    print("🎨 Launching Vite React Frontend...\n")
    
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir,
        env=os.environ.copy()
    )
    processes.append(frontend_proc)

    print("-" * 65)
    print(f"✅ Backend API running at: http://localhost:{BACKEND_PORT}")
    print(f"✅ Frontend Web running at: http://localhost:{FRONTEND_PORT}")
    print("👉 Press Ctrl+C at any time to stop both servers.")
    print("-" * 65 + "\n")

    # Monitor running processes
    try:
        while True:
            time.sleep(1)
            for proc in processes:
                if proc.poll() is not None:
                    pass
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()
