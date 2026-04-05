from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from statistics import mean
from uuid import uuid4

import httpx

from backend.app.core.config import Settings
from backend.app.schemas.analysis import AnalysisResult, AnalyzeContentRequest, EvidenceItem, RiskScores
from backend.app.schemas.email import EmailMessageDetail
from backend.app.services.mailbox_service import sender_risk, suspicious_link_domains

SYSTEM_PROMPT = """
You are Verifai's email authenticity analyzer. Your job is to assess whether an email is trustworthy, suspicious, or needs review.

You will receive:
- Email body content
- Subject line
- Sender address
- List of links found in the email

You must analyze the email and return ONLY a valid JSON object with no markdown or code fences.

Analyze these four risk dimensions:

1. ai_generated (0-100): How likely is this email AI-generated or synthetically written?
2. manipulated_reality (0-100): Does this email distort reality or present false evidence as real?
3. misleading_context (0-100): Is real content presented in a false or misleading framing?
4. source_credibility_risk (0-100): How risky is the sender/source?

Verdict rules:
- "likely_authentic": all risk scores low, no red flags, trusted source
- "needs_review": mixed signals, some suspicion but not conclusive
- "suspicious": strong manipulation signals, high risk scores, scam/phishing patterns

Confidence rules:
- High confidence (70-95): clear signals in one direction
- Medium confidence (40-69): mixed or ambiguous signals
- Low confidence (20-39): very little signal either way

Return ONLY this exact JSON structure:
{
  "verdict": "likely_authentic" | "needs_review" | "suspicious",
  "confidence": <integer 0-100>,
  "summary": "<1-2 plain English sentences for a normal user>",
  "risk_scores": {
    "ai_generated": <integer 0-100>,
    "manipulated_reality": <integer 0-100>,
    "misleading_context": <integer 0-100>,
    "source_credibility_risk": <integer 0-100>
  },
  "evidence": [
    {
      "label": "<short label>",
      "detail": "<1 plain English sentence explaining the signal>",
      "score_impact": <integer 0-100>
    }
  ]
}

Evidence rules:
- Return 2 to 5 evidence items
- Labels should be short and human-readable
- Details should be plain English, not technical jargon
- score_impact reflects how much this signal contributed to overall risk
- For legitimate emails, include positive evidence too
""".strip()

ALLOWED_VERDICTS = {"likely_authentic", "needs_review", "suspicious"}


class AnalysisService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._records: dict[str, AnalysisResult] = {}

    async def analyze_email(self, email: EmailMessageDetail) -> AnalysisResult:
        request = AnalyzeContentRequest(
            content=email.body_text or email.snippet,
            subject=email.subject,
            sender=email.from_email,
            links=email.links,
            source_type="email",
        )
        result = await self.analyze_content(request, source_id=email.id)
        self._records[result.id] = result
        return result

    async def analyze_content(
        self,
        request: AnalyzeContentRequest,
        source_id: str | None = None,
    ) -> AnalysisResult:
        if self.settings.groq_model_ready:
            try:
                result = await self._call_groq_model(request, source_id=source_id)
                self._records[result.id] = result
                return result
            except (httpx.HTTPError, ValueError, KeyError, TypeError):
                pass

        if self.settings.authenticity_model_url:
            try:
                result = await self._call_remote_model(request, source_id=source_id)
                self._records[result.id] = result
                return result
            except httpx.HTTPError:
                pass

        result = self._heuristic_analysis(request, source_id=source_id)
        self._records[result.id] = result
        return result

    def get_record(self, analysis_id: str) -> AnalysisResult | None:
        return self._records.get(analysis_id)

    async def _call_groq_model(
        self,
        request: AnalyzeContentRequest,
        source_id: str | None = None,
    ) -> AnalysisResult:
        if not self.settings.groq_api_key:
            raise ValueError("Groq API key is missing.")

        async with httpx.AsyncClient(timeout=self.settings.authenticity_model_timeout) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.settings.groq_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": self._build_groq_user_message(request)},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1024,
                },
            )
            response.raise_for_status()
            payload = response.json()

        raw_content = payload["choices"][0]["message"]["content"]
        groq_result = self._normalize_model_payload(self._parse_json_payload(raw_content))
        return self._build_analysis_result(
            payload=groq_result,
            request=request,
            source_id=source_id,
            model_mode="remote_model",
        )

    async def _call_remote_model(
        self,
        request: AnalyzeContentRequest,
        source_id: str | None = None,
    ) -> AnalysisResult:
        async with httpx.AsyncClient(timeout=self.settings.authenticity_model_timeout) as client:
            response = await client.post(
                self.settings.authenticity_model_url,
                json=request.model_dump(),
            )
            response.raise_for_status()
            payload = response.json()

        normalized_payload = self._normalize_model_payload(payload)
        return self._build_analysis_result(
            payload=normalized_payload,
            request=request,
            source_id=source_id,
            model_mode="remote_model",
        )

    def _heuristic_analysis(
        self,
        request: AnalyzeContentRequest,
        source_id: str | None = None,
    ) -> AnalysisResult:
        text = " ".join(filter(None, [request.subject, request.content]))
        normalized = text.lower()
        evidence: list[EvidenceItem] = []

        ai_markers = [
            "as an ai",
            "generated by ai",
            "chatgpt",
            "revolutionary breakthrough",
            "changes everything",
            "next-generation",
            "proprietary ai",
        ]
        manipulation_markers = [
            "leaked footage",
            "proof",
            "undeniable",
            "shocking",
            "banned by mainstream media",
            "hidden from you",
        ]
        context_markers = [
            "viral",
            "share immediately",
            "forward this",
            "before it gets deleted",
            "taken out of context",
            "everyone is saying",
            "experts are stunned",
        ]
        urgency_markers = [
            "urgent",
            "act now",
            "breaking",
            "cannot afford to miss",
            "guaranteed",
            "exclusive",
        ]

        ai_score = self._score_category(normalized, ai_markers, 22, evidence, "AI-generation cues")
        manipulated_score = self._score_category(normalized, manipulation_markers, 24, evidence, "Manipulation cues")
        context_score = self._score_category(normalized, context_markers, 18, evidence, "Misleading-context cues")
        context_score += self._score_category(normalized, urgency_markers, 10, evidence, "Pressure-language cues")

        sender_score = sender_risk(request.sender)
        if sender_score >= 45:
            evidence.append(
                EvidenceItem(
                    label="Sender trust gap",
                    detail="The sender domain does not look institutionally strong for high-stakes claims.",
                    score_impact=sender_score - 20,
                )
            )

        flagged_domains = suspicious_link_domains(request.links)
        if flagged_domains:
            evidence.append(
                EvidenceItem(
                    label="Link risk",
                    detail=f"Potentially risky or low-trust links were found: {', '.join(flagged_domains[:3])}.",
                    score_impact=min(30, 10 * len(flagged_domains)),
                )
            )

        link_risk = min(30, 10 * len(flagged_domains))
        source_risk = min(100, max(sender_score, 25 + link_risk))
        manipulated_score = min(100, manipulated_score + (15 if any(word in normalized for word in ["image", "video", "footage"]) else 0))
        context_score = min(100, context_score + (10 if not request.links and len(request.content) > 280 else 0))

        scores = RiskScores(
            ai_generated=min(100, ai_score),
            manipulated_reality=min(100, manipulated_score),
            misleading_context=min(100, context_score),
            source_credibility_risk=min(100, source_risk),
        )

        overall = mean(scores.model_dump().values())
        highest = max(scores.model_dump().values())
        if highest >= 75 or overall >= 65:
            verdict = "suspicious"
            summary = "This content shows multiple high-risk signals and should not be trusted without manual verification."
        elif highest >= 45 or overall >= 40:
            verdict = "needs_review"
            summary = "This content has notable risk indicators and needs additional verification before use or sharing."
        else:
            verdict = "likely_authentic"
            summary = "No strong manipulation patterns were detected by the fallback heuristic, but high-stakes claims still need human review."

        confidence = min(95, max(35, int(highest * 0.8 + len(evidence) * 3)))

        return AnalysisResult(
            id=str(uuid4()),
            source_type=request.source_type,
            source_id=source_id,
            verdict=verdict,
            confidence=confidence,
            summary=summary,
            model_mode="heuristic",
            risk_scores=scores,
            evidence=evidence[:6],
            content_preview=self._preview(request.content),
            created_at=datetime.now(timezone.utc),
        )

    def _score_category(
        self,
        normalized_text: str,
        markers: list[str],
        hit_value: int,
        evidence: list[EvidenceItem],
        evidence_label: str,
    ) -> int:
        hits = [marker for marker in markers if marker in normalized_text]
        if not hits:
            return 0

        evidence.append(
            EvidenceItem(
                label=evidence_label,
                detail=f"Detected phrases: {', '.join(hits[:3])}.",
                score_impact=min(40, len(hits) * hit_value),
            )
        )
        return min(100, len(hits) * hit_value)

    def _preview(self, content: str) -> str:
        compact = " ".join(content.split())
        return compact[:220] + ("..." if len(compact) > 220 else "")

    def _build_groq_user_message(self, request: AnalyzeContentRequest) -> str:
        links_str = "\n".join(request.links) if request.links else "None"
        return f"""
Analyze this email:

SUBJECT: {request.subject or "(no subject)"}
SENDER: {request.sender or "(unknown sender)"}
LINKS FOUND:
{links_str}

EMAIL BODY:
{request.content}
""".strip()

    def _parse_json_payload(self, raw: str) -> dict:
        clean = re.sub(r"```(?:json)?", "", raw).strip()
        clean = clean.strip("`").strip()
        start = clean.find("{")
        end = clean.rfind("}") + 1
        if start == -1 or end <= start:
            raise ValueError("No JSON object found in model response.")
        return json.loads(clean[start:end])

    def _normalize_model_payload(self, payload: dict) -> dict:
        verdict = payload.get("verdict", "needs_review")
        if verdict not in ALLOWED_VERDICTS:
            verdict = "needs_review"

        risk_scores = payload.get("risk_scores") or {}
        normalized_scores = {
            "ai_generated": self._clamp_int(risk_scores.get("ai_generated", 0)),
            "manipulated_reality": self._clamp_int(risk_scores.get("manipulated_reality", 0)),
            "misleading_context": self._clamp_int(risk_scores.get("misleading_context", 0)),
            "source_credibility_risk": self._clamp_int(risk_scores.get("source_credibility_risk", 0)),
        }

        normalized_evidence: list[dict] = []
        for item in payload.get("evidence", [])[:6]:
            if not isinstance(item, dict):
                continue
            normalized_evidence.append(
                {
                    "label": str(item.get("label", "Signal noticed")).strip() or "Signal noticed",
                    "detail": str(item.get("detail", "This signal affected the overall judgment.")).strip()
                    or "This signal affected the overall judgment.",
                    "score_impact": self._clamp_int(item.get("score_impact", 0)),
                }
            )

        if not normalized_evidence:
            normalized_evidence.append(
                {
                    "label": "Model response",
                    "detail": "The model returned a verdict, but not enough structured evidence details.",
                    "score_impact": 0,
                }
            )

        summary = str(payload.get("summary", "")).strip() or "This email was analyzed, but the response summary was incomplete."

        return {
            "verdict": verdict,
            "confidence": self._clamp_int(payload.get("confidence", 50)),
            "summary": summary,
            "risk_scores": normalized_scores,
            "evidence": normalized_evidence,
        }

    def _build_analysis_result(
        self,
        payload: dict,
        request: AnalyzeContentRequest,
        source_id: str | None,
        model_mode: str,
    ) -> AnalysisResult:
        return AnalysisResult(
            id=str(uuid4()),
            source_type=request.source_type,
            source_id=source_id,
            verdict=payload["verdict"],
            confidence=payload["confidence"],
            summary=payload["summary"],
            model_mode=model_mode,
            risk_scores=RiskScores.model_validate(payload["risk_scores"]),
            evidence=[EvidenceItem.model_validate(item) for item in payload.get("evidence", [])],
            content_preview=self._preview(request.content),
            created_at=datetime.now(timezone.utc),
        )

    def _clamp_int(self, value: object, default: int = 0) -> int:
        try:
            numeric = int(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            numeric = default
        return max(0, min(100, numeric))
