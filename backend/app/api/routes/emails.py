from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.dependencies import get_mailbox_service
from backend.app.schemas.email import EmailMessageDetail, EmailMessageSummary
from backend.app.services.mailbox_service import MailboxError, MailboxService

router = APIRouter()


@router.get("", response_model=list[EmailMessageSummary])
async def list_emails(
    session_id: str = Query(..., min_length=6),
    limit: int = Query(10, ge=1, le=25),
    mailbox_service: MailboxService = Depends(get_mailbox_service),
) -> list[EmailMessageSummary]:
    try:
        return await mailbox_service.list_messages(session_id=session_id, limit=limit)
    except MailboxError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - network/runtime failure path
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to load emails from the mailbox provider.",
        ) from exc


@router.get("/{email_id}", response_model=EmailMessageDetail)
async def get_email(
    email_id: str,
    session_id: str = Query(..., min_length=6),
    mailbox_service: MailboxService = Depends(get_mailbox_service),
) -> EmailMessageDetail:
    try:
        return await mailbox_service.get_message(session_id=session_id, message_id=email_id)
    except MailboxError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - network/runtime failure path
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to load the requested email.",
        ) from exc
