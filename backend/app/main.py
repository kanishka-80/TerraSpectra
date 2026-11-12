
from fastapi import FastAPI

from backend.app.core.config import settings


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    description="Hyperspectral Crop Stress Intelligence Platform",
)


@app.get("/")
def root():
    return {
        "message": "Welcome to TerraSpectra API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
    }
