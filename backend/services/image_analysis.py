# Owner: AI/ML Lead — Image Analysis
# File: backend/services/image_analysis.py
# Description: Sightengine API integration stub for image and video analysis.
#              Detects AI-generated content, deepfakes, and image manipulation.
#              Replace the stub below with real API calls once keys are configured.

import os
import httpx
from typing import Optional

SIGHTENGINE_API_URL = "https://api.sightengine.com/1.0/check.json"
API_USER = os.getenv("SIGHTENGINE_API_USER", "")
API_SECRET = os.getenv("SIGHTENGINE_API_SECRET", "")


async def analyze_image(image_bytes: bytes, filename: str) -> dict:
    """
    Send an image to Sightengine for AI-generation and deepfake detection.

    TODO: Uncomment and test once SIGHTENGINE_API_USER / SIGHTENGINE_API_SECRET are set.

    Args:
        image_bytes: Raw bytes of the image file.
        filename: Original filename (used to set the MIME type).

    Returns:
        dict with keys: ai_generated, deepfake, manipulation scores (0-100).
    """
    # --- STUB: return mock scores ---
    # When ready, replace with:
    #
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         SIGHTENGINE_API_URL,
    #         data={
    #             "models": "deepfake,genai",
    #             "api_user": API_USER,
    #             "api_secret": API_SECRET,
    #         },
    #         files={"media": (filename, image_bytes)},
    #         timeout=30.0,
    #     )
    #     data = response.json()
    #     return {
    #         "ai_generated": int((data.get("type", {}).get("ai_generated", 0)) * 100),
    #         "deepfake": int((data.get("face", {}).get("deepfake", 0)) * 100),
    #         "manipulation": int((data.get("media", {}).get("manipulation", {}).get("score", 0)) * 100),
    #     }

    return {
        "ai_generated": 82,
        "deepfake": 54,
        "manipulation": 71,
    }


async def analyze_video(video_bytes: bytes, filename: str) -> dict:
    """
    Send a video to Sightengine for deepfake detection.

    TODO: Implement with Sightengine video workflow (async job).

    Returns:
        dict with deepfake and manipulation scores.
    """
    # --- STUB ---
    return {
        "ai_generated": 45,
        "deepfake": 78,
        "manipulation": 68,
    }
