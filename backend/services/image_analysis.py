# Owner: AI/ML Lead — Image Analysis
# File: backend/services/image_analysis.py
# Description: Sightengine API integration for AI-generated image and deepfake
#              detection. Uses genai, deepfake, and faces models.

import os
import httpx

SIGHTENGINE_API_URL = "https://api.sightengine.com/1.0/check.json"

SIGHTENGINE_API_USER   = os.getenv("SIGHTENGINE_API_USER", "")
SIGHTENGINE_API_SECRET = os.getenv("SIGHTENGINE_API_SECRET", "")


async def analyze_image(file_bytes: bytes, filename: str) -> dict:
    """
    Send image bytes to Sightengine and return a structured verdict.

    Args:
        file_bytes: Raw bytes of the image.
        filename:   Original filename (sets the multipart content-type hint).

    Returns:
        Unified verdict dict compatible with the /analyze response schema.
    """
    signals: list[str] = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                SIGHTENGINE_API_URL,
                data={
                    "models":     "genai,deepfake,faces",
                    "api_user":   SIGHTENGINE_API_USER,
                    "api_secret": SIGHTENGINE_API_SECRET,
                },
                files={"media": (filename, file_bytes)},
            )
            resp.raise_for_status()
            data = resp.json()

        # ── Extract scores ────────────────────────────────────────────────────
        ai_score       = round((data.get("type",     {}).get("ai_generated", 0)) * 100)
        deepfake_score = round((data.get("deepfake",  {}).get("score",       0)) * 100)

        # Per-face deepfake score (first face if present)
        faces = data.get("faces") or []
        face_deepfake_score = 0
        if faces:
            face_deepfake_score = round(
                (faces[0].get("deepfake") or 0) * 100
            )
            deepfake_score = max(deepfake_score, face_deepfake_score)

        manipulation_score = max(ai_score, deepfake_score)

        # ── Verdict ───────────────────────────────────────────────────────────
        if manipulation_score >= 75:
            verdict = "ai_generated"
        elif manipulation_score >= 50:
            verdict = "suspicious"
        else:
            verdict = "likely_authentic"

        # ── Signals ───────────────────────────────────────────────────────────
        if ai_score > 70:
            signals.append("Strong AI generation signature detected")
        elif ai_score > 40:
            signals.append("Moderate AI generation probability")

        if deepfake_score > 70:
            signals.append("Facial deepfake indicators present")
        elif deepfake_score > 40:
            signals.append("Moderate deepfake probability in facial region")

        if face_deepfake_score > 60 and face_deepfake_score > deepfake_score - 10:
            signals.append("Facial geometry inconsistencies detected")

        if not signals:
            signals.append("No significant manipulation indicators found")

        explanation = _build_explanation(verdict, ai_score, deepfake_score)

        return {
            "verdict":      verdict,
            "confidence":   manipulation_score,
            "content_type": "image",
            "scores": {
                "ai_generated": ai_score,
                "deepfake":     deepfake_score,
                "manipulation": manipulation_score,
                "context_match": 0,
            },
            "signals":     signals[:5],
            "explanation": explanation,
        }

    except Exception as exc:
        print(f"[Verifai] Sightengine error: {exc}")
        return {
            "verdict":      "inconclusive",
            "confidence":   0,
            "content_type": "image",
            "scores":       {"ai_generated": 0, "deepfake": 0, "manipulation": 0, "context_match": 0},
            "signals":      ["Image analysis service unavailable"],
            "explanation":  "The image analysis service could not be reached. Please try again later.",
        }


def _build_explanation(verdict: str, ai_score: int, deepfake_score: int) -> str:
    if verdict == "ai_generated":
        return (
            f"This image shows strong indicators of AI generation (score: {ai_score}/100) "
            f"or deepfake manipulation (score: {deepfake_score}/100). "
            "Treat this content with significant caution."
        )
    if verdict == "suspicious":
        return (
            "Some AI generation or manipulation signals were detected, but the result is not conclusive. "
            "Consider verifying the source before sharing."
        )
    return (
        "No significant signs of AI generation or deepfake manipulation were detected. "
        "The image appears to be authentic."
    )
