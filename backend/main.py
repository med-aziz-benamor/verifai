# Owner: Backend Lead
# File: backend/main.py
# Description: FastAPI application entry point. Configures CORS, registers all routers,
#              and exposes a health check endpoint.
# Run: uvicorn main:app --reload

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.analyze import router as analyze_router
from routes.url_check import router as url_check_router

load_dotenv()

app = FastAPI(
    title="Verifai API",
    description="AI-powered content verification platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins in development. Restrict in production.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(analyze_router, prefix="", tags=["Analysis"])
app.include_router(url_check_router, prefix="", tags=["URL Check"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health_check():
    """Quick health check endpoint."""
    return {"status": "ok", "service": "Verifai API"}
