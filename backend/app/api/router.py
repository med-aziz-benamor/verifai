from fastapi import APIRouter

from backend.app.api.routes import analysis, auth, emails, health

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(emails.router, prefix="/emails", tags=["emails"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
