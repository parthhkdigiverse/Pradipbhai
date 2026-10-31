import os
import sys
import time
import shutil
import multiprocessing
from pathlib import Path

# Required for Windows executables using multiprocessing/asyncio
multiprocessing.freeze_support()

# Determine root directory based on execution context
if getattr(sys, "frozen", False):
    APP_ROOT = Path(sys.executable).resolve().parent
    BUNDLE_DIR = Path(getattr(sys, "_MEIPASS", APP_ROOT))
else:
    APP_ROOT = Path(__file__).resolve().parent
    BUNDLE_DIR = APP_ROOT

# Ensure backend directory is in sys.path
backend_path = BUNDLE_DIR / "backend"
if backend_path.exists() and str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))
if str(BUNDLE_DIR) not in sys.path:
    sys.path.insert(0, str(BUNDLE_DIR))

# Ensure .env exists next to the application
env_file = APP_ROOT / ".env"
env_example = BUNDLE_DIR / ".env.example"
if not env_file.exists() and env_example.exists():
    try:
        shutil.copyfile(env_example, env_file)
        print(f"ℹ️ Created default .env configuration file at: {env_file}")
    except Exception:
        pass

try:
    import uvicorn
    from app.config import settings
    from app.main import app
except ImportError as e:
    print(f"❌ Failed to import backend modules: {e}")
    sys.exit(1)


def main():
    port = settings.BACKEND_PORT or 8000
    print(f"[Backend Server] Starting FastAPI on 0.0.0.0:{port}...")
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port,
            log_level="info",
            loop="asyncio"
        )
    except (KeyboardInterrupt, SystemExit):
        print("\n[Backend Server] Shutting down cleanly.")


if __name__ == "__main__":
    main()
