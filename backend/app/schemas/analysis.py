from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class RiskScores(BaseModel):
    ai_generated: int = Field(ge=0, le=100)
    manipulated_reality: int = Field(ge=0, le=100)
    misleading_context: int = Field(ge=0, le=100)
    source_credibility_risk: int = Field(ge=0, le=100)


class EvidenceItem(BaseModel):
    label: str
    detail: str
    score_impact: int


class AnalyzeContentRequest(BaseModel):
    content: str
    subject: str | None = None
    sender: str | None = None
    links: list[str] = Field(default_factory=list)
    source_type: str = "email"


class AnalysisResult(BaseModel):
    id: str
    source_type: str
    source_id: str | None = None
    verdict: Literal["likely_authentic", "needs_review", "suspicious"]
    confidence: int = Field(ge=0, le=100)
    summary: str
    model_mode: Literal["heuristic", "remote_model"]
    risk_scores: RiskScores
    evidence: list[EvidenceItem] = Field(default_factory=list)
    content_preview: str
    created_at: datetime
