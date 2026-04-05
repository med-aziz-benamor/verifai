from __future__ import annotations

from functools import lru_cache

from backend.app.core.config import get_settings
from backend.app.services.analysis_service import AnalysisService
from backend.app.services.mailbox_service import MailboxService
from backend.app.services.session_store import SessionStore


@lru_cache(maxsize=1)
def get_session_store() -> SessionStore:
    return SessionStore()


@lru_cache(maxsize=1)
def get_mailbox_service() -> MailboxService:
    return MailboxService(settings=get_settings(), session_store=get_session_store())


@lru_cache(maxsize=1)
def get_analysis_service() -> AnalysisService:
    return AnalysisService(settings=get_settings())
