from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ProviderInfo(BaseModel):
    id: str
    name: str
    auth_mode: Literal["oauth", "mock"]
    ready: bool
    notes: list[str] = Field(default_factory=list)


class MailboxSession(BaseModel):
    session_id: str
    provider: str
    email_address: str | None = None
    created_at: datetime
    status: Literal["demo", "connected"]
    access_token: str | None = None
    refresh_token: str | None = None


class MailboxSessionResponse(BaseModel):
    session_id: str
    provider: str
    email_address: str | None = None
    status: Literal["demo", "connected"]
    message: str


class OAuthStartResponse(BaseModel):
    provider: str
    authorization_url: str
    state: str
    redirect_uri: str
