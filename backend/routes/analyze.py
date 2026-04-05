# Owner: Backend Lead — AI Analysis Team
# File: backend/routes/analyze.py
# Description: POST /analyze endpoint. Accepts a file (image, video, PDF) or raw
#              text, routes to the appropriate service, and returns a structured
#              verdict JSON.

import base64

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from services.text_analysis  import analyze_text
from services.image_analysis import analyze_image

router = APIRouter()


class ImageBase64Request(BaseModel):
    image_base64: str
    filename: str = "image.jpg"


@router.post("/analyze-image-base64")
async def analyze_image_base64(payload: ImageBase64Request):
    """
    Analyze an image supplied as a base64-encoded string.
    Used by the Facebook content script which cannot send multipart form data
    cross-origin but can POST JSON.
    """
    try:
        image_data = base64.b64decode(payload.image_base64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 data: {exc}")

    result = await analyze_image(image_data, payload.filename)
    return JSONResponse(content=result)


@router.post("/analyze")
async def analyze(
    file:     Optional[UploadFile] = File(None),
    text:     Optional[str]        = Form(None),
    page_url: Optional[str]        = Form(None),
):
    """
    Analyze a piece of content for misinformation signals.

    - **file**: An image (JPEG/PNG/GIF/WebP) or PDF uploaded via multipart form data.
    - **text**: Raw text submitted as a form field.
    - **page_url**: Optional URL of the page the content came from (used for context scoring).

    Returns a structured JSON verdict with confidence scores and detected signals.
    """
    if file is None and (text is None or text.strip() == ""):
        raise HTTPException(
            status_code=400,
            detail="Provide either a 'file' or a 'text' field.",
        )

    # ── Text ─────────────────────────────────────────────────────────────────
    if text and text.strip():
        result = await analyze_text(text.strip(), page_url)
        return JSONResponse(content=result)

    # ── File ─────────────────────────────────────────────────────────────────
    content_type = (file.content_type or "").lower()
    file_bytes   = await file.read()

    # Image
    if "image" in content_type:
        result = await analyze_image(file_bytes, file.filename or "upload")
        return JSONResponse(content=result)

    # PDF — extract text then run text analysis
    if "pdf" in content_type:
        try:
            import fitz  # PyMuPDF

            doc       = fitz.open(stream=file_bytes, filetype="pdf")
            extracted = " ".join(page.get_text() for page in doc)
            doc.close()
        except Exception as exc:
            print(f"[Verifai] PDF extraction error: {exc}")
            return JSONResponse(content={
                "verdict":      "inconclusive",
                "confidence":   0,
                "content_type": "pdf",
                "scores":       {},
                "signals":      ["PDF text extraction failed"],
                "explanation":  "Could not extract text from this PDF file.",
            })

        if len(extracted.strip()) < 80:
            return JSONResponse(content={
                "verdict":      "inconclusive",
                "confidence":   0,
                "content_type": "pdf",
                "scores":       {},
                "signals":      ["Insufficient text in PDF"],
                "explanation":  "Could not extract enough text from the PDF to perform a reliable analysis.",
            })

        result = await analyze_text(extracted[:3000], page_url)
        result["content_type"] = "pdf"
        return JSONResponse(content=result)

    # Video — not yet implemented
    if "video" in content_type:
        return JSONResponse(content={
            "verdict":      "inconclusive",
            "confidence":   0,
            "content_type": "video",
            "scores":       {},
            "signals":      ["Video analysis coming soon"],
            "explanation":  (
                "Video deepfake detection is not yet available. "
                "Please try with an image or text."
            ),
        })

    raise HTTPException(
        status_code=415,
        detail=f"Unsupported file type: {content_type or 'unknown'}",
    )
