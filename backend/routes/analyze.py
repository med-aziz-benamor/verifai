# Owner: Backend Lead — AI Analysis Team
# File: backend/routes/analyze.py
# Description: POST /analyze endpoint. Accepts a file (image, video, PDF) or raw text,
#              detects the content type, and returns a structured verdict JSON.
#              Currently returns mocked data — real AI service calls go in services/.

import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional

router = APIRouter()

# ---------------------------------------------------------------------------
# Supported MIME type categories
# ---------------------------------------------------------------------------
IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"}
VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/avi"}
PDF_TYPES   = {"application/pdf"}


def _detect_content_type(content_type: str) -> str:
    """Map a MIME type to a high-level category string."""
    if content_type in IMAGE_TYPES:
        return "image"
    if content_type in VIDEO_TYPES:
        return "video"
    if content_type in PDF_TYPES:
        return "pdf"
    return "text"


def _mock_verdict(content_category: str) -> dict:
    """Return a realistic-looking mocked analysis result."""
    # TODO: replace with real service calls from services/
    verdicts = {
        "image": {
            "verdict": "suspicious",
            "confidence": 87,
            "scores": {
                "ai_generated": 82,
                "deepfake": 54,
                "manipulation": 71,
                "context_match": 23,
            },
            "signals": [
                "Facial distortion detected",
                "GAN-style texture artifacts",
                "Caption mismatch with visual content",
            ],
            "explanation": (
                "This image shows several hallmarks of AI-generated or manipulated content. "
                "High-frequency noise patterns and facial geometry inconsistencies are consistent "
                "with GAN-based synthesis. Treat with caution."
            ),
            "content_type": content_category,
        },
        "video": {
            "verdict": "likely_manipulated",
            "confidence": 74,
            "scores": {
                "ai_generated": 45,
                "deepfake": 78,
                "manipulation": 68,
                "context_match": 31,
            },
            "signals": [
                "Temporal inconsistencies between frames",
                "Blending artifacts around facial region",
                "Audio-visual lip-sync mismatch",
            ],
            "explanation": (
                "Frame-level analysis detected blending artifacts and temporal inconsistencies "
                "commonly seen in deepfake video synthesis pipelines."
            ),
            "content_type": content_category,
        },
        "pdf": {
            "verdict": "likely_authentic",
            "confidence": 61,
            "scores": {
                "ai_generated": 38,
                "deepfake": 0,
                "manipulation": 29,
                "context_match": 70,
            },
            "signals": [
                "Some AI-written passages detected",
                "Metadata indicates recent creation",
            ],
            "explanation": (
                "The document appears mostly authentic, though certain passages exhibit "
                "statistical patterns associated with LLM-generated text."
            ),
            "content_type": content_category,
        },
        "text": {
            "verdict": "ai_generated",
            "confidence": 91,
            "scores": {
                "ai_generated": 91,
                "deepfake": 0,
                "manipulation": 15,
                "context_match": 48,
            },
            "signals": [
                "High perplexity uniformity",
                "Low burstiness score",
                "Consistent sentence length distribution",
            ],
            "explanation": (
                "The text exhibits strong statistical markers of LLM generation: "
                "unusually uniform perplexity and very low burstiness relative to human-written text."
            ),
            "content_type": content_category,
        },
    }
    return verdicts.get(content_category, verdicts["text"])


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.post("/analyze")
async def analyze(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
):
    """
    Analyze a piece of content for misinformation signals.

    - **file**: An image, video, or PDF file uploaded via multipart form data.
    - **text**: Raw text submitted as a form field.

    Returns a structured JSON verdict with confidence scores and detected signals.
    """
    if file is None and (text is None or text.strip() == ""):
        raise HTTPException(
            status_code=422,
            detail="You must provide either a 'file' or 'text' field.",
        )

    if file is not None:
        content_category = _detect_content_type(file.content_type or "")
    else:
        content_category = "text"

    result = _mock_verdict(content_category)
    return JSONResponse(content=result)
