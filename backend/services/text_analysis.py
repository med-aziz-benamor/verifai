# Owner: AI/ML Lead — Text Analysis
# File: backend/services/text_analysis.py
# Description: GPTZero + Anthropic Claude API integration stubs for AI text detection
#              and contextual analysis. Replace stubs with real API calls once keys are set.

import os
import httpx
from typing import Optional

GPTZERO_API_URL = "https://api.gptzero.me/v2/predict/text"
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

GPTZERO_API_KEY = os.getenv("GPTZERO_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


async def detect_ai_text(text: str) -> dict:
    """
    Use GPTZero to detect if the given text was AI-generated.

    TODO: Uncomment once GPTZERO_API_KEY is configured.

    Args:
        text: The text string to analyse.

    Returns:
        dict with keys: ai_generated_score (0-100), perplexity, burstiness.
    """
    # --- STUB ---
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         GPTZERO_API_URL,
    #         headers={
    #             "x-api-key": GPTZERO_API_KEY,
    #             "Content-Type": "application/json",
    #         },
    #         json={"document": text},
    #         timeout=30.0,
    #     )
    #     data = response.json()
    #     doc = data.get("documents", [{}])[0]
    #     return {
    #         "ai_generated_score": int(doc.get("completely_generated_prob", 0) * 100),
    #         "perplexity": doc.get("average_generated_prob", 0),
    #         "burstiness": doc.get("burstiness", 0),
    #     }

    return {
        "ai_generated_score": 91,
        "perplexity": 0.87,
        "burstiness": 0.12,
    }


async def analyse_context_with_claude(text: str, claim: Optional[str] = None) -> dict:
    """
    Use Anthropic Claude to contextually analyse a piece of text for
    misinformation signals, logical inconsistencies, or factual contradictions.

    TODO: Uncomment once ANTHROPIC_API_KEY is configured.

    Args:
        text: The content to analyse.
        claim: Optional specific claim to fact-check against the content.

    Returns:
        dict with keys: context_match_score (0-100), explanation, signals list.
    """
    # --- STUB ---
    # system_prompt = (
    #     "You are a fact-checking assistant. Analyse the following content for "
    #     "misinformation signals, logical inconsistencies, and factual inaccuracies. "
    #     "Return a JSON object with: context_match_score (0-100), explanation, signals (list of strings)."
    # )
    # user_message = f"Content:\n{text}"
    # if claim:
    #     user_message += f"\n\nSpecific claim to verify:\n{claim}"
    #
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         ANTHROPIC_API_URL,
    #         headers={
    #             "x-api-key": ANTHROPIC_API_KEY,
    #             "anthropic-version": "2023-06-01",
    #             "Content-Type": "application/json",
    #         },
    #         json={
    #             "model": "claude-3-5-sonnet-20241022",
    #             "max_tokens": 512,
    #             "system": system_prompt,
    #             "messages": [{"role": "user", "content": user_message}],
    #         },
    #         timeout=60.0,
    #     )
    #     import json
    #     raw = response.json()["content"][0]["text"]
    #     return json.loads(raw)

    return {
        "context_match_score": 23,
        "explanation": "The text contains several factual claims that lack supporting evidence.",
        "signals": ["Unverified statistics cited", "Source not attributable"],
    }
