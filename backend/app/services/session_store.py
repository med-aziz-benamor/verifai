from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from backend.app.schemas.auth import MailboxSession


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, MailboxSession] = {}

    def create(
        self,
        provider: str,
        status: str,
        email_address: str | None = None,
        access_token: str | None = None,
        refresh_token: str | None = None,
    ) -> MailboxSession:
        session = MailboxSession(
            session_id=str(uuid4()),
            provider=provider,
            email_address=email_address,
            created_at=datetime.now(timezone.utc),
            status=status,  # type: ignore[arg-type]
            access_token=access_token,
            refresh_token=refresh_token,
        )
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> MailboxSession | None:
        return self._sessions.get(session_id)
