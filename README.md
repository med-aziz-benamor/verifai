# Verifai 🔍

> **See through the noise.** — AI-powered content verification platform.

Verifai is a hackathon project that helps users detect misinformation, AI-generated media, deepfakes, and suspicious URLs in real-time.

## Project Structure

```
verifai/
├── frontend/      # Next.js 14 + TypeScript + Tailwind CSS
├── backend/       # FastAPI (Python 3.11+) REST API
└── extension/     # Chrome Manifest V3 browser extension
```

## Quick Start

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your API keys
uvicorn main:app --reload
# API docs: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
cp ../.env.example .env.local  # set NEXT_PUBLIC_API_URL
npm run dev
# App: http://localhost:3000
```

### Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/analyze` | Analyze file or text for misinformation |
| POST | `/url-check` | Check URL credibility |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11+, uvicorn |
| Extension | Vanilla JS, Chrome Manifest V3 |
| AI Services | Sightengine, GPTZero, Claude, URLScan.io, Google Safe Browsing |

## Team

Built for MenaCraft Hackathon 2026.
