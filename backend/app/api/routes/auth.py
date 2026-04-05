from __future__ import annotations

from urllib.parse import urlencode
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from backend.app.dependencies import get_mailbox_service
from backend.app.schemas.auth import MailboxSessionResponse, OAuthStartResponse, ProviderInfo
from backend.app.services.mailbox_service import MailboxError, MailboxService

router = APIRouter()


@router.get("/providers", response_model=list[ProviderInfo])
async def list_providers(
    mailbox_service: MailboxService = Depends(get_mailbox_service),
) -> list[ProviderInfo]:
    return mailbox_service.list_providers()


@router.post("/mock/connect", response_model=MailboxSessionResponse)
async def connect_mock_mailbox(
    mailbox_service: MailboxService = Depends(get_mailbox_service),
) -> MailboxSessionResponse:
    session = mailbox_service.create_mock_session()
    return MailboxSessionResponse(
        session_id=session.session_id,
        provider=session.provider,
        email_address=session.email_address,
        status=session.status,
        message="Demo mailbox connected. Use this session to explore the email-analysis flow without OAuth.",
    )


@router.get("/gmail/start", response_model=OAuthStartResponse)
async def start_gmail_oauth(
    state: str = Query(default_factory=lambda: str(uuid4())),
    mailbox_service: MailboxService = Depends(get_mailbox_service),
) -> OAuthStartResponse:
    try:
        authorization_url = mailbox_service.build_gmail_auth_url(state=state)
    except MailboxError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return OAuthStartResponse(
        provider="gmail",
        authorization_url=authorization_url,
        state=state,
        redirect_uri=mailbox_service.settings.gmail_redirect_uri or "",
    )


@router.get("/gmail/callback")
async def complete_gmail_oauth(
    code: str = Query(..., min_length=10),
    mailbox_service: MailboxService = Depends(get_mailbox_service),
):
    frontend_url = mailbox_service.settings.frontend_callback_url

    try:
        session = await mailbox_service.create_gmail_session_from_code(code)
    except MailboxError as exc:
        if frontend_url:
            query = urlencode(
                {
                    "mail_auth": "error",
                    "mail_error": "gmail_inbox_unavailable",
                    "mail_detail": str(exc),
                }
            )
            return RedirectResponse(url=f"{frontend_url}?{query}", status_code=status.HTTP_302_FOUND)

        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - network/runtime failure path
        if frontend_url:
            query = urlencode(
                {
                    "mail_auth": "error",
                    "mail_error": "gmail_token_exchange_failed",
                }
            )
            return RedirectResponse(url=f"{frontend_url}?{query}", status_code=status.HTTP_302_FOUND)

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gmail token exchange failed. Check the OAuth credentials and redirect URI.",
        ) from exc

    if frontend_url:
        query = urlencode(
            {
                "mail_auth": "success",
                "session_id": session.session_id,
                "provider": session.provider,
            }
        )
        return RedirectResponse(url=f"{frontend_url}?{query}", status_code=status.HTTP_302_FOUND)

    return MailboxSessionResponse(
        session_id=session.session_id,
        provider=session.provider,
        email_address=session.email_address,
        status=session.status,
        message="Gmail mailbox connected successfully.",
    )


@router.get("/sessions/{session_id}", response_model=MailboxSessionResponse)
async def get_session_status(
    session_id: str,
    mailbox_service: MailboxService = Depends(get_mailbox_service),
) -> MailboxSessionResponse:
    try:
        session = mailbox_service.get_session(session_id)
    except MailboxError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return MailboxSessionResponse(
        session_id=session.session_id,
        provider=session.provider,
        email_address=session.email_address,
        status=session.status,
        message="Mailbox session is active.",
    )
