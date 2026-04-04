# Owner: Backend Lead — URL Safety Team
# File: backend/routes/url_check.py
# Description: POST /url-check endpoint. Accepts a URL string in the request body and
#              returns a credibility/safety verdict JSON.
#              Currently returns mocked data — real checks go in services/url_analysis.py.

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl

router = APIRouter()


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------
class URLCheckRequest(BaseModel):
    url: str  # keep as str so we can return it back easily; validate below


# ---------------------------------------------------------------------------
# Mock verdict helper
# ---------------------------------------------------------------------------
def _mock_url_verdict(url: str) -> dict:
    """Return a realistic-looking mocked URL credibility result."""
    # TODO: replace with real URLScan.io + Google Safe Browsing calls in services/
    return {
        "url": url,
        "verdict": "suspicious",
        "risk_level": "high",
        "confidence": 78,
        "signals": [
            "Domain registered within the last 30 days",
            "No valid SSL certificate",
            "Flagged by 3 threat intelligence feeds",
            "Redirects to known phishing domain",
        ],
        "explanation": (
            "This URL exhibits multiple high-risk indicators: it was registered very recently, "
            "does not have a valid SSL certificate, and has been detected by multiple threat "
            "intelligence providers as a suspected phishing endpoint."
        ),
    }


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.post("/url-check")
async def url_check(body: URLCheckRequest):
    """
    Check the credibility and safety of a URL.

    Request body:
    ```json
    { "url": "https://example.com" }
    ```

    Returns a structured JSON verdict including risk level, confidence, and detected signals.
    """
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=422, detail="'url' field must not be empty.")

    # Basic sanity check — must start with http:// or https://
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(
            status_code=422,
            detail="URL must start with 'http://' or 'https://'.",
        )

    result = _mock_url_verdict(url)
    return JSONResponse(content=result)
