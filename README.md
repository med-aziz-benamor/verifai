# Verifai

Verifai is a hackathon project focused on helping users assess whether digital content is authentic, manipulated, AI-generated, or presented in a misleading context.

## Project layout

- `src/` contains the React frontend
- `backend/` contains the FastAPI backend for mailbox connection and analysis

## Frontend

```powershell
npm install
npm run dev
```

## Backend

```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

See `backend/README.md` for the mailbox-analysis flow, environment variables, and useful API endpoints.
