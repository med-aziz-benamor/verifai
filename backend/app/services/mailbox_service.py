from __future__ import annotations

import base64
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from html import unescape
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

import httpx

from backend.app.core.config import Settings
from backend.app.schemas.auth import MailboxSession, ProviderInfo
from backend.app.schemas.email import EmailAttachment, EmailMessageDetail, EmailMessageSummary
from backend.app.services.session_store import SessionStore


URL_PATTERN = re.compile(r"https?://[^\s<>\"]+")
TAG_PATTERN = re.compile(r"<[^>]+>")
FREE_EMAIL_DOMAINS = {
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
    "icloud.com",
    "protonmail.com",
}


def _html_to_text(value: str) -> str:
    without_tags = TAG_PATTERN.sub(" ", value)
    return re.sub(r"\s+", " ", unescape(without_tags)).strip()


def _extract_links(text: str) -> list[str]:
    seen: dict[str, None] = {}
    for match in URL_PATTERN.findall(text):
        seen[match.rstrip(".,;!?)")] = None
    return list(seen.keys())


class MailboxError(Exception):
    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class MailboxProvider(ABC):
    provider_id: str

    @abstractmethod
    async def list_messages(self, session: MailboxSession, limit: int = 10) -> list[EmailMessageSummary]:
        raise NotImplementedError

    @abstractmethod
    async def get_message(self, session: MailboxSession, message_id: str) -> EmailMessageDetail:
        raise NotImplementedError


class MockMailboxProvider(MailboxProvider):
    provider_id = "mock"

    def __init__(self) -> None:
        self._messages = [
            EmailMessageDetail(
                id="mock-1",
                thread_id="thread-1",
                subject="Reuters fact check on viral bridge collapse image",
                **{"from": "alerts@reuters.com"},
                snippet="We reviewed the viral image and found signs it was reposted with false location claims.",
                received_at=datetime(2026, 4, 4, 8, 30, tzinfo=timezone.utc),
                labels=["INBOX", "IMPORTANT"],
                to=["team@verifai.local"],
                cc=[],
                body_text=(
                    "Reuters reviewed the viral bridge collapse image circulating online. "
                    "The photo is authentic, but the captions claiming it happened this week in Lagos are false. "
                    "Original reporting and timestamps show the image was taken during a 2023 flood in another country. "
                    "Read the source report at https://www.reuters.com/fact-check/example."
                ),
                links=["https://www.reuters.com/fact-check/example"],
                attachments=[],
                raw_headers={"Subject": "Reuters fact check on viral bridge collapse image"},
            ),
            EmailMessageDetail(
                id="mock-2",
                thread_id="thread-2",
                subject="URGENT: leaked footage proves the election was fake",
                **{"from": "truth.central.alerts@protonmail.com"},
                snippet="Share this with everyone before it gets deleted. The video proves everything.",
                received_at=datetime(2026, 4, 4, 9, 15, tzinfo=timezone.utc),
                labels=["INBOX"],
                to=["team@verifai.local"],
                cc=[],
                body_text=(
                    "Breaking. This leaked footage proves the entire election was staged. "
                    "Share immediately before authorities remove it. "
                    "The clip has already been banned by mainstream media. "
                    "Watch here: http://breaking-proof-news.biz/leak and download the attached frame grab."
                ),
                links=["http://breaking-proof-news.biz/leak"],
                attachments=[
                    EmailAttachment(filename="frame-grab.png", mime_type="image/png", size=184203),
                ],
                raw_headers={"Subject": "URGENT: leaked footage proves the election was fake"},
            ),
            EmailMessageDetail(
                id="mock-3",
                thread_id="thread-3",
                subject="Next-generation opportunity you cannot afford to miss",
                **{"from": "futurealpha.ai@invest-now.net"},
                snippet="Our proprietary AI discovered a hidden opportunity with guaranteed returns.",
                received_at=datetime(2026, 4, 4, 10, 10, tzinfo=timezone.utc),
                labels=["INBOX"],
                to=["team@verifai.local"],
                cc=[],
                body_text=(
                    "Our proprietary AI discovered a once-in-a-lifetime opportunity with guaranteed 300 percent returns. "
                    "This is a revolutionary breakthrough that changes everything. "
                    "Experts are stunned. Act now and forward this to your network. "
                    "Sign up at https://invest-now.net/alpha."
                ),
                links=["https://invest-now.net/alpha"],
                attachments=[],
                raw_headers={"Subject": "Next-generation opportunity you cannot afford to miss"},
            ),
        ]

    async def list_messages(self, session: MailboxSession, limit: int = 10) -> list[EmailMessageSummary]:
        return [EmailMessageSummary.model_validate(message.model_dump(by_alias=True)) for message in self._messages[:limit]]

    async def get_message(self, session: MailboxSession, message_id: str) -> EmailMessageDetail:
        for message in self._messages:
            if message.id == message_id:
                return message
        raise MailboxError(f"Mock email '{message_id}' was not found.", status_code=404)


class GmailMailboxProvider(MailboxProvider):
    provider_id = "gmail"
    base_url = "https://gmail.googleapis.com/gmail/v1/users/me"
    oauth_authorize_url = "https://accounts.google.com/o/oauth2/v2/auth"
    oauth_token_url = "https://oauth2.googleapis.com/token"
    profile_url = "https://www.googleapis.com/oauth2/v2/userinfo"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def build_auth_url(self, state: str) -> str:
        if not self.settings.gmail_oauth_ready:
            raise MailboxError("Gmail OAuth is not configured yet.")

        query = urlencode(
            {
                "client_id": self.settings.gmail_client_id,
                "redirect_uri": self.settings.gmail_redirect_uri,
                "response_type": "code",
                "scope": " ".join(self.settings.gmail_scopes),
                "access_type": "offline",
                "prompt": "consent",
                "state": state,
            }
        )
        return f"{self.oauth_authorize_url}?{query}"

    async def exchange_code(self, code: str) -> tuple[str, str | None, str | None]:
        if not self.settings.gmail_oauth_ready:
            raise MailboxError("Gmail OAuth is not configured yet.")

        async with httpx.AsyncClient(timeout=20) as client:
            token_response = await client.post(
                self.oauth_token_url,
                data={
                    "code": code,
                    "client_id": self.settings.gmail_client_id,
                    "client_secret": self.settings.gmail_client_secret,
                    "redirect_uri": self.settings.gmail_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            payload = token_response.json()

            access_token = payload["access_token"]
            refresh_token = payload.get("refresh_token")

            profile_response = await client.get(
                self.profile_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            profile_response.raise_for_status()
            email_address = profile_response.json().get("email")

        return access_token, refresh_token, email_address

    async def list_messages(self, session: MailboxSession, limit: int = 10) -> list[EmailMessageSummary]:
        payload = await self._get_json(
            session,
            f"{self.base_url}/messages",
            params={"maxResults": limit, "labelIds": ["INBOX"]},
        )
        messages = payload.get("messages", [])

        summaries: list[EmailMessageSummary] = []
        for item in messages:
            detail_payload = await self._get_json(
                session,
                f"{self.base_url}/messages/{item['id']}",
                params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
            )
            summaries.append(self._normalize_gmail_message(detail_payload, include_bodies=False))
        return summaries

    async def get_message(self, session: MailboxSession, message_id: str) -> EmailMessageDetail:
        payload = await self._get_json(
            session,
            f"{self.base_url}/messages/{message_id}",
            params={"format": "full"},
        )
        return self._normalize_gmail_message(payload, include_bodies=True)

    async def _get_json(self, session: MailboxSession, url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if not session.access_token:
            raise MailboxError("This Gmail session is missing an access token.")

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.get(
                    url,
                    params=params,
                    headers={"Authorization": f"Bearer {session.access_token}"},
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise self._gmail_http_error(exc) from exc

            return response.json()

    def _gmail_http_error(self, exc: httpx.HTTPStatusError) -> MailboxError:
        response = exc.response
        status_code = response.status_code
        provider_message = self._extract_provider_error_message(response)
        provider_reason = self._extract_provider_error_reason(response)
        lowered_message = provider_message.lower()
        lowered_reason = provider_reason.lower()

        if status_code == 401:
            return MailboxError(
                "Your Gmail connection expired. Disconnect the mailbox and connect Gmail again.",
                status_code=401,
            )

        if (
            "mail service not enabled" in lowered_message
            or "failedprecondition" in lowered_message
            or "precondition check failed" in lowered_message
            or lowered_reason == "failedprecondition"
        ):
            return MailboxError(
                "This account signed in to Google, but it does not have a usable Gmail inbox for Verifai to read. Try a real Gmail account or a Google Workspace account with Gmail enabled.",
                status_code=400,
            )

        if "insufficient" in lowered_message or "scope" in lowered_message or "permission" in lowered_message:
            return MailboxError(
                "Google sign-in worked, but Gmail inbox permission was not granted. Disconnect and connect Gmail again, then accept inbox access.",
                status_code=403,
            )

        if status_code == 403:
            return MailboxError(
                "Gmail blocked inbox access for this account. Make sure the Gmail API is enabled and that this signed-in account can use Gmail.",
                status_code=403,
            )

        if status_code == 429:
            return MailboxError(
                "Gmail is busy right now. Wait a moment and refresh the inbox.",
                status_code=429,
            )

        if provider_message:
            return MailboxError(f"Gmail could not load this inbox: {provider_message}", status_code=status_code)

        return MailboxError("Gmail could not load this inbox right now.", status_code=status_code)

    def _extract_provider_error_message(self, response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return response.text.strip()

        error = payload.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str) and message.strip():
                return message.strip()

            errors = error.get("errors")
            if isinstance(errors, list):
                for item in errors:
                    if isinstance(item, dict):
                        item_message = item.get("message")
                        if isinstance(item_message, str) and item_message.strip():
                            return item_message.strip()

        if isinstance(error, str) and error.strip():
            return error.strip()

        message = payload.get("message")
        if isinstance(message, str) and message.strip():
            return message.strip()

        return response.text.strip()

    def _extract_provider_error_reason(self, response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return ""

        error = payload.get("error")
        if isinstance(error, dict):
            reason = error.get("status")
            if isinstance(reason, str) and reason.strip():
                return reason.strip()

            errors = error.get("errors")
            if isinstance(errors, list):
                for item in errors:
                    if isinstance(item, dict):
                        item_reason = item.get("reason")
                        if isinstance(item_reason, str) and item_reason.strip():
                            return item_reason.strip()

        return ""

    def _normalize_gmail_message(self, payload: dict[str, Any], include_bodies: bool) -> EmailMessageDetail:
        headers = self._header_map(payload)
        body_text, body_html, attachments = self._extract_body_and_attachments(payload.get("payload", {}), include_bodies)
        snippet = payload.get("snippet", "")
        combined_text = " ".join(filter(None, [body_text, body_html or "", snippet]))

        return EmailMessageDetail(
            id=payload["id"],
            thread_id=payload.get("threadId"),
            subject=headers.get("subject", "(no subject)"),
            **{"from": headers.get("from", "unknown sender")},
            snippet=snippet,
            received_at=self._parse_date(headers.get("date")),
            labels=payload.get("labelIds", []),
            to=self._split_address_header(headers.get("to")),
            cc=self._split_address_header(headers.get("cc")),
            body_text=body_text if include_bodies else "",
            body_html=body_html if include_bodies else None,
            links=_extract_links(combined_text),
            attachments=attachments,
            raw_headers=headers,
        )

    def _extract_body_and_attachments(
        self,
        payload: dict[str, Any],
        include_bodies: bool,
    ) -> tuple[str, str | None, list[EmailAttachment]]:
        text_parts: list[str] = []
        html_parts: list[str] = []
        attachments: list[EmailAttachment] = []

        for part in self._iter_parts(payload):
            mime_type = (part.get("mimeType") or "").lower()
            body = part.get("body", {})
            data = body.get("data")
            filename = part.get("filename") or ""

            if filename:
                attachments.append(
                    EmailAttachment(
                        filename=filename,
                        mime_type=mime_type or None,
                        size=body.get("size"),
                    )
                )

            if not include_bodies or not data:
                continue

            decoded = self._decode_gmail_data(data)
            if mime_type == "text/plain":
                text_parts.append(decoded)
            elif mime_type == "text/html":
                html_parts.append(decoded)

        body_html = "\n\n".join(part for part in html_parts if part.strip()) or None
        body_text = "\n\n".join(part for part in text_parts if part.strip())
        if not body_text and body_html:
            body_text = _html_to_text(body_html)

        return body_text.strip(), body_html, attachments

    def _iter_parts(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        parts = payload.get("parts") or []
        if not parts:
            return [payload]

        collected: list[dict[str, Any]] = []
        stack = list(parts)
        while stack:
            part = stack.pop()
            collected.append(part)
            stack.extend(part.get("parts") or [])
        return collected

    def _header_map(self, payload: dict[str, Any]) -> dict[str, str]:
        raw_headers = payload.get("payload", {}).get("headers", [])
        headers: dict[str, str] = {}
        for header in raw_headers:
            name = header.get("name", "").lower()
            if name:
                headers[name] = header.get("value", "")
        return headers

    def _parse_date(self, raw: str | None) -> datetime | None:
        if not raw:
            return None
        try:
            parsed = datetime.strptime(raw[:31], "%a, %d %b %Y %H:%M:%S")
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    def _split_address_header(self, raw: str | None) -> list[str]:
        if not raw:
            return []
        return [item.strip() for item in raw.split(",") if item.strip()]

    def _decode_gmail_data(self, value: str) -> str:
        padded = value + "=" * (-len(value) % 4)
        return base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8", errors="ignore")


class MailboxService:
    def __init__(self, settings: Settings, session_store: SessionStore) -> None:
        self.settings = settings
        self.session_store = session_store
        self.providers: dict[str, MailboxProvider] = {
            "mock": MockMailboxProvider(),
            "gmail": GmailMailboxProvider(settings),
        }

    def list_providers(self) -> list[ProviderInfo]:
        return [
            ProviderInfo(
                id="mock",
                name="Demo mailbox",
                auth_mode="mock",
                ready=True,
                notes=["Best for hackathon demos before real inbox auth is ready."],
            ),
            ProviderInfo(
                id="gmail",
                name="Gmail",
                auth_mode="oauth",
                ready=self.settings.gmail_oauth_ready,
                notes=[
                    "Requires Google OAuth client credentials.",
                    "Reads inbox messages with the gmail.readonly scope.",
                ],
            ),
        ]

    def create_mock_session(self) -> MailboxSession:
        return self.session_store.create(
            provider="mock",
            status="demo",
            email_address="demo@verifai.local",
        )

    def get_session(self, session_id: str) -> MailboxSession:
        session = self.session_store.get(session_id)
        if not session:
            raise MailboxError("Mailbox session was not found. Connect a mailbox first.", status_code=404)
        return session

    def build_gmail_auth_url(self, state: str) -> str:
        provider = self._require_provider("gmail", GmailMailboxProvider)
        return provider.build_auth_url(state)

    async def create_gmail_session_from_code(self, code: str) -> MailboxSession:
        provider = self._require_provider("gmail", GmailMailboxProvider)
        access_token, refresh_token, email_address = await provider.exchange_code(code)
        provisional_session = MailboxSession(
            session_id="gmail-validation",
            provider="gmail",
            email_address=email_address,
            created_at=datetime.now(timezone.utc),
            status="connected",
            access_token=access_token,
            refresh_token=refresh_token,
        )
        await provider.list_messages(provisional_session, limit=1)
        return self.session_store.create(
            provider="gmail",
            status="connected",
            email_address=email_address,
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def list_messages(self, session_id: str, limit: int = 10) -> list[EmailMessageSummary]:
        session = self.get_session(session_id)
        provider = self._provider_for_session(session)
        return await provider.list_messages(session, limit=limit)

    async def get_message(self, session_id: str, message_id: str) -> EmailMessageDetail:
        session = self.get_session(session_id)
        provider = self._provider_for_session(session)
        return await provider.get_message(session, message_id)

    def _provider_for_session(self, session: MailboxSession) -> MailboxProvider:
        return self._require_provider(session.provider, MailboxProvider)

    def _require_provider(self, provider_id: str, expected_type: type[MailboxProvider]) -> MailboxProvider:
        provider = self.providers.get(provider_id)
        if not provider or not isinstance(provider, expected_type):
            raise MailboxError(f"Mailbox provider '{provider_id}' is not available.", status_code=404)
        return provider


def sender_domain(sender: str | None) -> str | None:
    if not sender or "@" not in sender:
        return None
    domain = sender.rsplit("@", 1)[-1].strip(">").lower()
    return domain or None


def suspicious_link_domains(links: list[str]) -> list[str]:
    flagged: list[str] = []
    for link in links:
        parsed = urlparse(link)
        domain = parsed.netloc.lower()
        if not parsed.scheme.startswith("https") or domain.endswith((".biz", ".top", ".xyz")):
            flagged.append(domain or link)
        query = parse_qs(parsed.query)
        if "redirect" in query or "url" in query:
            flagged.append(domain or link)
    return flagged


def sender_risk(sender: str | None) -> int:
    domain = sender_domain(sender)
    if not domain:
        return 55
    if domain in FREE_EMAIL_DOMAINS:
        return 45
    if domain.endswith((".biz", ".top", ".xyz")):
        return 75
    return 20
