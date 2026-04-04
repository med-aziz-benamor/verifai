# Owner: Backend Lead — URL Safety Team
# File: backend/routes/url_check.py
# Description: POST /url-check endpoint. Accepts a URL and returns a credibility
#              and safety verdict via Google Safe Browsing + URLScan.io.

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.url_analysis import analyze_url

router = APIRouter()


class URLCheckRequest(BaseModel):
    url: str


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

    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(
            status_code=422,
            detail="URL must start with 'http://' or 'https://'.",
        )

    result = await analyze_url(url)
    return JSONResponse(content=result)
