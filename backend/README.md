# Verifai Backend

FastAPI backend for the Verifai hackathon MVP.

## What it supports

- Gmail OAuth connection flow
- Mock mailbox for demos when OAuth is not ready
- Email listing and detail fetch
- Email analysis orchestration
- Fallback heuristic scoring when the real authenticity model is still in progress
- External model adapter via `VERIFAI_AUTH_MODEL_URL`
- Direct Groq model integration via `VERIFAI_GROQ_API_KEY`

## Quick start

1. Create a virtual environment.
2. Install dependencies.
3. Copy `.env.example` to `.env` and fill in Gmail credentials if you have them.
4. Add a Groq API key if you want the real analysis model instead of the heuristic fallback.
5. Start the API:

```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

## Useful endpoints

- `GET /api/v1/health`
- `GET /api/v1/auth/providers`
- `POST /api/v1/auth/mock/connect`
- `GET /api/v1/auth/gmail/start`
- `GET /api/v1/auth/gmail/callback`
- `GET /api/v1/emails?session_id=...`
- `GET /api/v1/emails/{email_id}?session_id=...`
- `POST /api/v1/analysis/email/{email_id}?session_id=...`
- `POST /api/v1/analysis/content`
- `GET /api/v1/analysis/{analysis_id}`

## Hackathon notes

- Sessions and analysis records are stored in memory for now.
- Gmail support is real, but only if OAuth credentials are configured.
- After Gmail auth, the backend redirects the browser back to `VERIFAI_FRONTEND_CALLBACK_URL`.
- The heuristic analyzer is a fallback and should be framed as decision support, not ground truth.
- If `VERIFAI_GROQ_API_KEY` is set, the backend will call Groq directly for structured email analysis.
