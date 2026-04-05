# Owner: AI/ML Lead — Text Analysis
# File: backend/services/text_analysis.py
# Description: HuggingFace (ChatGPT-detector-RoBERTa) + Groq (Llama 3.3 70B) chaining
#              for AI text detection (Axis 1) and contextual consistency analysis (Axis 2).

from dotenv import load_dotenv
load_dotenv()  # ensure .env is loaded even if this module is imported before main.py

import os
import json
import asyncio
import traceback
import httpx
from groq import Groq
from typing import Optional

HF_MODEL_URL = "https://router.huggingface.co/models/Hello-SimpleAI/chatgpt-detector-roberta"

HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
GROQ_API_KEY        = os.getenv("GROQ_API_KEY", "")


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

        print(f"[DEBUG] HF raw response status: {response.status_code}")
        print(f"[DEBUG] HF raw response body: {response.text[:300]}")

        data = response.json()
        print(f"[DEBUG] HF parsed data: {data}")

        if isinstance(data, list):
            inner = data[0] if isinstance(data[0], list) else data
            for item in inner:
                if isinstance(item, dict):
                    label = item.get("label", "")
                    score = item.get("score", 0)
                    if label in ("LABEL_1", "Fake", "ChatGPT", "AI"):
                        return round(score * 100)
                    if label in ("LABEL_0", "Real", "Human"):
                        return round((1 - score) * 100)

    print(f"[DEBUG] HF unexpected shape, returning 50")
    return 50  # fallback if unexpected response shape


async def analyze_text(text: str, page_url: Optional[str] = None) -> dict:
    """
    Analyze text for AI generation (HuggingFace) and contextual consistency (Gemini).
    Returns a unified verdict dict.
    """

    # ── Guard: too short ─────────────────────────────────────────────────────
    if len(text.strip()) < 20:
        return {
            "verdict": "inconclusive",
            "confidence": 0,
            "content_type": "text",
            "scores": {"ai_generated": 0, "context_match": 0},
            "signals": ["Text too short for reliable analysis"],
            "explanation": "Text too short for reliable analysis (minimum 20 characters)",
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
        signals.append("HuggingFace unavailable — Gemini only")

    # ── Step 2: Groq (Llama 3.3 70B) ─────────────────────────────────────────
    print(f"[DEBUG] Groq KEY present: {bool(GROQ_API_KEY)}")
    print(f"[DEBUG] Groq KEY starts with: {GROQ_API_KEY[:8] if GROQ_API_KEY else 'NONE'}")

    prompt = f"""You are an expert forensic linguist specializing in \
detecting AI-generated text. Analyze the text below carefully.

IMPORTANT CALIBRATION RULES — read before scoring:
- Casual, conversational, imperfect, or colloquial text = likely HUMAN
- Text with typos, fragments, or informal grammar = likely HUMAN
- Text that is repetitive, overly formal, uses "Furthermore/Additionally/\
In conclusion", uniform sentence length = likely AI
- Short personal anecdotes or opinions = likely HUMAN
- Generic informational paragraphs without a personal voice = likely AI
- Score 0-30 = human written
- Score 31-60 = uncertain, could be either
- Score 61-100 = likely AI generated

TEXT TO ANALYZE:
{text}

PAGE URL (context, may be null): {page_url or 'unknown'}

Return ONLY this JSON, no markdown, no extra text:
{{
  "ai_confidence": <integer 0-100, follow calibration rules strictly>,
  "context_consistent": <true or false>,
  "context_confidence": <integer 0-100>,
  "signals": [<2-4 specific signals you actually observed in THIS text>],
  "explanation": "<2 sentences, plain language, mention specific things you noticed>"
}}

SIGNAL EXAMPLES for AI text:
- "Repetitive transitional phrases: Furthermore, Additionally, In conclusion"
- "Unusually uniform sentence length throughout"
- "Generic informational tone with no personal voice"
- "Predictable corporate vocabulary"

SIGNAL EXAMPLES for human text:
- "Casual conversational tone with informal grammar"
- "Personal anecdote with natural imperfections"
- "Colloquial expressions and sentence fragments"
"""

    try:
        loop   = asyncio.get_event_loop()
        client = Groq(api_key=GROQ_API_KEY)

        def _groq_call():
            return client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=512,
            )

        completion = await loop.run_in_executor(None, _groq_call)
        raw        = completion.choices[0].message.content.strip()

        print(f"[DEBUG] Groq raw response: {raw[:200]}")

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        claude_data               = json.loads(raw)
        claude_ai_confidence      = int(claude_data.get("ai_confidence", 50))
        claude_context_confidence = int(claude_data.get("context_confidence", 50))
        claude_signals            = claude_data.get("signals", [])
        claude_explanation        = claude_data.get("explanation", "")
        signals.extend(claude_signals)
        claude_ok = True
        print(f"[DEBUG] Groq ai_confidence={claude_ai_confidence}, context_confidence={claude_context_confidence}")

    except json.JSONDecodeError as exc:
        print(f"[Verifai] Groq JSON parse error: {type(exc).__name__}: {exc}")
        traceback.print_exc()
        signals.append("Groq unavailable — HuggingFace only")
    except Exception as exc:
        print(f"[Verifai] Groq error: {type(exc).__name__}: {exc}")
        traceback.print_exc()
        signals.append("Groq unavailable — HuggingFace only")

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
    if hf_ok and claude_ok:
        agreement = abs(hf_score - claude_ai_confidence)
        if agreement < 20:
            final_score = (hf_score * 0.35) + (claude_ai_confidence * 0.65)
        elif agreement < 40:
            final_score = (hf_score * 0.25) + (claude_ai_confidence * 0.75)
            signals.append("Mixed signals — moderate confidence only")
        else:
            final_score = claude_ai_confidence
            signals.append("Detectors disagree — Groq analysis used")
    elif hf_ok:
        final_score = hf_score
    else:
        final_score = claude_ai_confidence

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

    print(f"[DEBUG] Final verdict={verdict}, score={round(final_score)}, hf_ok={hf_ok}, groq_ok={claude_ok}")

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
