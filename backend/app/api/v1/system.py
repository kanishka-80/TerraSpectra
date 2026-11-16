from fastapi import APIRouter

from backend.app.core.config import settings

router = APIRouter()


@router.get("/status")
def get_system_status():
    return {
        "status": "operational",
        "service": settings.APP_NAME,
        "version": "v1",
    }
