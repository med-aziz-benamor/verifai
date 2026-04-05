from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.dependencies import get_analysis_service, get_mailbox_service
from backend.app.schemas.analysis import AnalysisResult, AnalyzeContentRequest
from backend.app.services.analysis_service import AnalysisService
from backend.app.services.mailbox_service import MailboxError, MailboxService

router = APIRouter()


@router.post("/email/{email_id}", response_model=AnalysisResult)
async def analyze_email(
    email_id: str,
    session_id: str = Query(..., min_length=6),
    mailbox_service: MailboxService = Depends(get_mailbox_service),
    analysis_service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisResult:
    try:
        email = await mailbox_service.get_message(session_id=session_id, message_id=email_id)
    except MailboxError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - network/runtime failure path
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch the email before analysis.",
        ) from exc

    return await analysis_service.analyze_email(email)


@router.post("/content", response_model=AnalysisResult)
async def analyze_content(
    request: AnalyzeContentRequest,
    analysis_service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisResult:
    return await analysis_service.analyze_content(request)


@router.get("/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(
    analysis_id: str,
    analysis_service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisResult:
    result = analysis_service.get_record(analysis_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis record was not found. Run analysis first or check the ID.",
        )
    return result
