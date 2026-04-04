# Owner: AI/ML Lead — Text Analysis
# File: backend/services/text_analysis.py
# Description: HuggingFace (RoBERTa detector) + Claude API chaining for AI text
#              detection (Axis 1) and contextual consistency analysis (Axis 2).

from dotenv import load_dotenv
load_dotenv()  # ensure .env is loaded even if this module is imported before main.py

import os
import json
import asyncio
import traceback
import httpx
from typing import Optional

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
HF_MODEL_URL      = "https://api-inference.huggingface.co/models/openai-community/roberta-base-openai-detector"

HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
ANTHROPIC_API_KEY   = os.getenv("ANTHROPIC_API_KEY", "")


async def call_hf_detector(text: str) -> float:
    """
    Call the HuggingFace RoBERTa OpenAI detector.
    Returns a score 0-100 where 100 = definitely AI-generated.

    The model returns two labels: LABEL_0 (human) and LABEL_1 (AI/fake).
    We want the score for LABEL_1.
    """
    headers   = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    truncated = text[:1500]  # model max input is 512 tokens

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            HF_MODEL_URL,
            headers=headers,
            json={"inputs": truncated},
        )

        if response.status_code == 503:
            # Model is cold-starting — wait and retry once
            await asyncio.sleep(20)
            response = await client.post(
                HF_MODEL_URL,
                headers=headers,
                json={"inputs": truncated},
            )

        data = response.json()

        # Response shape: [[{"label": "LABEL_0", "score": 0.12},
        #                    {"label": "LABEL_1", "score": 0.88}]]
        if isinstance(data, list) and len(data) > 0:
            scores = data[0] if isinstance(data[0], list) else data
            for item in scores:
                if item.get("label") == "LABEL_1":
                    return round(item["score"] * 100)

    return 50  # fallback if unexpected response shape


async def analyze_text(text: str, page_url: Optional[str] = None) -> dict:
    """
    Analyze text for AI generation (HuggingFace) and contextual consistency (Claude).
    Returns a unified verdict dict.
    """

    # ── Guard: too short ─────────────────────────────────────────────────────
    if len(text.strip()) < 80:
        return {
            "verdict": "inconclusive",
            "confidence": 0,
            "content_type": "text",
            "scores": {"ai_generated": 0, "context_match": 0},
            "signals": ["Text too short for reliable analysis"],
            "explanation": "We need at least 80 characters to perform a reliable analysis.",
        }

    signals: list[str] = []
    hf_score  = 50
    hf_ok     = False

    claude_ai_confidence      = 50
    claude_context_confidence = 50
    claude_explanation        = "Analysis could not be completed."
    claude_ok                 = False

    # ── Step 1: HuggingFace RoBERTa detector ─────────────────────────────────
    print(f"[DEBUG] HF API KEY present: {bool(HUGGINGFACE_API_KEY)}")
    print(f"[DEBUG] HF API KEY starts with: {HUGGINGFACE_API_KEY[:8] if HUGGINGFACE_API_KEY else 'NONE'}")

    try:
        hf_score = await call_hf_detector(text)
        hf_ok    = True
        print(f"[DEBUG] HF score: {hf_score}")
    except Exception as exc:
        print(f"[Verifai] HF error: {type(exc).__name__}: {exc}")
        traceback.print_exc()
        signals.append("HuggingFace unavailable — Claude only")

    # ── Step 2: Claude ────────────────────────────────────────────────────────
    print(f"[DEBUG] Anthropic KEY present: {bool(ANTHROPIC_API_KEY)}")
    print(f"[DEBUG] Anthropic KEY starts with: {ANTHROPIC_API_KEY[:8] if ANTHROPIC_API_KEY else 'NONE'}")

    system_prompt = (
        "You are a misinformation detection expert. Analyze the given text "
        "and return ONLY a JSON object — no markdown, no explanation, "
        "no extra text before or after the JSON."
    )

    user_prompt = f"""Analyze this text for AI generation and contextual consistency.

TEXT:
{text}

PAGE URL (context, may be null): {page_url or 'unknown'}

Return ONLY this JSON structure, no other text:
{{
  "ai_confidence": <integer 0-100>,
  "context_consistent": <true or false>,
  "context_confidence": <integer 0-100>,
  "signals": [<list of 2-4 specific short signal strings>],
  "explanation": "<2 sentences max, plain language for non-technical users>"
}}

Signal examples (use similar specific phrasing):
- "Unusually uniform sentence length"
- "Repetitive transitional phrases typical of LLMs"
- "Claim inconsistent with page topic"
- "Overly formal tone for this context"
- "Low perplexity — highly predictable word choices"
"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-6",
                    "max_tokens": 512,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}],
                },
            )
            resp.raise_for_status()
            raw_text = resp.json()["content"][0]["text"].strip()
            print(f"[DEBUG] Claude raw response: {raw_text[:200]}")

        # Strip accidental markdown fences if Claude wraps output
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        parsed = json.loads(raw_text)
        claude_ai_confidence      = int(parsed.get("ai_confidence", 50))
        claude_context_confidence = int(parsed.get("context_confidence", 50))
        claude_explanation        = parsed.get("explanation", "")
        claude_signals            = parsed.get("signals", [])
        signals.extend(claude_signals)
        claude_ok = True
        print(f"[DEBUG] Claude ai_confidence={claude_ai_confidence}, context_confidence={claude_context_confidence}")

    except json.JSONDecodeError as exc:
        print(f"[Verifai] Claude JSON parse error: {type(exc).__name__}: {exc}")
        traceback.print_exc()
        signals.append("Claude unavailable — HuggingFace only")
    except Exception as exc:
        print(f"[Verifai] Claude error: {type(exc).__name__}: {exc}")
        traceback.print_exc()
        signals.append("Claude unavailable — HuggingFace only")

    # ── Both failed ───────────────────────────────────────────────────────────
    if not hf_ok and not claude_ok:
        return {
            "verdict": "inconclusive",
            "confidence": 0,
            "content_type": "text",
            "scores": {"ai_generated": 0, "context_match": 0},
            "signals": ["Analysis services unavailable"],
            "explanation": "Analysis services unavailable.",
        }

    # ── Step 3: Combine scores ────────────────────────────────────────────────
    agreement = abs(hf_score - claude_ai_confidence)

    if agreement < 15:
        final_score = (hf_score * 0.6) + (claude_ai_confidence * 0.4)
    elif agreement < 30:
        final_score = (hf_score * 0.5) + (claude_ai_confidence * 0.5)
        signals.append("Mixed signals — moderate confidence only")
    else:
        final_score = 50
        signals.append("Models disagree — treat result with caution")

    # ── Step 4: Verdict ───────────────────────────────────────────────────────
    if final_score >= 75:
        verdict = "ai_generated"
    elif final_score >= 50:
        verdict = "suspicious"
    elif final_score >= 25:
        verdict = "likely_authentic"
    else:
        verdict = "authentic"

    # Deduplicate and cap at 5
    seen = set()
    deduped = []
    for s in signals:
        if s not in seen:
            seen.add(s)
            deduped.append(s)
        if len(deduped) == 5:
            break

    print(f"[DEBUG] Final verdict={verdict}, score={round(final_score)}, hf_ok={hf_ok}, claude_ok={claude_ok}")

    return {
        "verdict": verdict,
        "confidence": round(final_score),
        "content_type": "text",
        "scores": {
            "ai_generated": round(hf_score),
            "context_match": round(claude_context_confidence),
        },
        "signals": deduped,
        "explanation": claude_explanation,
    }
