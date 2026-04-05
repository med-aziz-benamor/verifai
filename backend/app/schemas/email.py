from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EmailAttachment(BaseModel):
    filename: str
    mime_type: str | None = None
    size: int | None = None


class EmailMessageSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    thread_id: str | None = None
    subject: str
    from_email: str = Field(alias="from")
    snippet: str
    received_at: datetime | None = None
    labels: list[str] = Field(default_factory=list)


class EmailMessageDetail(EmailMessageSummary):
    to: list[str] = Field(default_factory=list)
    cc: list[str] = Field(default_factory=list)
    body_text: str = ""
    body_html: str | None = None
    links: list[str] = Field(default_factory=list)
    attachments: list[EmailAttachment] = Field(default_factory=list)
    raw_headers: dict[str, str] = Field(default_factory=dict)
