from fastapi import APIRouter

from backend.app.core.config import get_settings

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str | bool]:
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.env,
        "gmail_oauth_ready": settings.gmail_oauth_ready,
        "authenticity_model_configured": bool(settings.authenticity_model_url or settings.groq_model_ready),
        "groq_model_ready": settings.groq_model_ready,
    }
