import uvicorn
from app.config import settings

if __name__ == "__main__":
    is_dev = settings.ENVIRONMENT.lower() == "development"
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.BACKEND_PORT,
        reload=is_dev
    )
