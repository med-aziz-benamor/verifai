from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load_env_file()


@dataclass(frozen=True)
class Settings:
    app_name: str
    env: str
    api_prefix: str
    cors_origins: list[str]
    gmail_client_id: str | None
    gmail_client_secret: str | None
    gmail_redirect_uri: str | None
    gmail_scopes: tuple[str, ...]
    authenticity_model_url: str | None
    authenticity_model_timeout: float
    groq_api_key: str | None
    groq_model: str
    frontend_callback_url: str | None

    @property
    def gmail_oauth_ready(self) -> bool:
        return bool(self.gmail_client_id and self.gmail_client_secret and self.gmail_redirect_uri)

    @property
    def groq_model_ready(self) -> bool:
        return bool(self.groq_api_key)


def _split_csv(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        app_name="Verifai Mail Intelligence API",
        env=os.getenv("VERIFAI_ENV", "development"),
        api_prefix="/api/v1",
        cors_origins=_split_csv(
            os.getenv(
                "VERIFAI_CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:4173,http://localhost:8080,http://127.0.0.1:8080",
            )
        ),
        gmail_client_id=os.getenv("VERIFAI_GMAIL_CLIENT_ID") or None,
        gmail_client_secret=os.getenv("VERIFAI_GMAIL_CLIENT_SECRET") or None,
        gmail_redirect_uri=os.getenv("VERIFAI_GMAIL_REDIRECT_URI") or None,
        gmail_scopes=(
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/gmail.readonly",
        ),
        authenticity_model_url=os.getenv("VERIFAI_AUTH_MODEL_URL") or None,
        authenticity_model_timeout=float(os.getenv("VERIFAI_AUTH_MODEL_TIMEOUT", "20")),
        groq_api_key=os.getenv("VERIFAI_GROQ_API_KEY") or None,
        groq_model=os.getenv("VERIFAI_GROQ_MODEL", "llama-3.3-70b-versatile"),
        frontend_callback_url=os.getenv("VERIFAI_FRONTEND_CALLBACK_URL", "http://127.0.0.1:8080/dashboard") or None,
    )
