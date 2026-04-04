# Verifai

> **See through the noise.** — AI-powered content verification platform.

Verifai helps users detect misinformation, AI-generated media, deepfakes, and suspicious URLs in real-time — directly in the browser, through a web dashboard, or via API.

Built for the **MenaCraft Hackathon 2026**.

---

## What It Does

Verifai analyzes content across four categories and returns a structured verdict with confidence scores, detected signals, and a plain-language explanation:

| Content Type | What It Detects |
|---|---|
| **Text** | AI-generated writing (LLM detection via GPTZero), perplexity/burstiness analysis |
| **Image** | AI-generated images, GAN artifacts, deepfake faces, caption mismatches (via Sightengine) |
| **Video** | Deepfake faces, temporal inconsistencies, audio-visual lip-sync mismatch |
| **PDF** | AI-written passages, metadata anomalies, document manipulation |
| **URL** | Phishing domains, threat intelligence flags, SSL issues, domain age (via URLScan.io + Google Safe Browsing) |

Every analysis returns a verdict from one of: `authentic` · `likely_authentic` · `suspicious` · `likely_manipulated` · `ai_generated`.

---

## Project Structure

```
verifai/
├── backend/               # FastAPI REST API (Python 3.11+)
│   ├── main.py            # App entry point — CORS, router registration
│   ├── requirements.txt   # Python dependencies
│   ├── .env.example       # API key template
│   ├── routes/
│   │   ├── analyze.py     # POST /analyze — file & text analysis endpoint
│   │   └── url_check.py   # POST /url-check — URL credibility endpoint
│   └── services/
│       ├── text_analysis.py   # GPTZero + Claude API integration
│       ├── image_analysis.py  # Sightengine API integration
│       └── url_analysis.py    # URLScan.io + Google Safe Browsing integration
│
├── frontend/              # Vite + React 18 + TypeScript web app
│   ├── package.json
│   ├── vite.config.ts     # Dev server on :8080, proxies /api → :8000
│   ├── tailwind.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx            # Router setup (React Router v6)
│       ├── lib/api.ts         # Typed API client (analyzeContent, checkUrl)
│       ├── pages/
│       │   ├── Index.tsx      # Landing / marketing page
│       │   ├── Dashboard.tsx  # Upload → analyze → result flow
│       │   ├── Extension.tsx  # Extension info page
│       │   └── NotFound.tsx   # 404 page
│       └── components/
│           ├── Header.tsx, Footer.tsx, BrandLogo.tsx
│           ├── UploadCard.tsx     # File/text/URL input
│           ├── ResultCard.tsx     # Verdict display with scores & signals
│           ├── ScoreBar.tsx       # Animated confidence bar
│           ├── VerdictBadge.tsx   # Color-coded verdict label
│           ├── LoadingState.tsx   # Analysis in-progress animation
│           ├── UrlRiskBanner.tsx  # URL threat summary
│           ├── SignalChip.tsx     # Individual signal tag
│           └── ui/                # 50+ shadcn/ui base components
│
└── extension/             # Chrome Extension (Manifest V3)
    ├── manifest.json      # MV3 config — permissions, service worker, content script
    ├── background.js      # Service worker — context menus, URL auto-check, badge
    ├── content.js         # Injected script — floating "Verify" button on text selection
    └── popup/
        ├── popup.html     # Extension popup — 3 tabs (Current Page / Text / URL)
        └── popup.js       # Tab logic, API calls, result rendering
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Chrome (for the extension)

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in your API keys (see Environment Variables below)
uvicorn main:app --reload
```

API is now running at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App is now running at **http://localhost:8080**
(The Vite dev server automatically proxies `/api/*` → `http://localhost:8000`)

### 3. Chrome Extension

> **Important:** The extension requires icon files before it can load. Create them first:
>
> ```bash
> mkdir extension/icons
> # Add icon16.png, icon32.png, icon48.png, icon128.png to that directory
> ```

Then load it:

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `extension/` folder
4. The **Verifai Lens** extension will appear in your toolbar

---

## API Reference

Base URL: `http://localhost:8000`

### `GET /health`

Health check.

```json
{ "status": "ok", "service": "Verifai API" }
```

---

### `POST /analyze`

Analyze a file or text for misinformation signals.

**Request** — multipart/form-data:

| Field | Type | Description |
|---|---|---|
| `file` | File | Image (JPEG/PNG/GIF/WebP), Video (MP4/WebM/MOV), or PDF |
| `text` | string | Raw text to analyze (use instead of file) |

One of `file` or `text` is required.

**Response:**

```json
{
  "verdict": "suspicious",
  "confidence": 87,
  "content_type": "image",
  "scores": {
    "ai_generated": 82,
    "deepfake": 54,
    "manipulation": 71,
    "context_match": 23
  },
  "signals": [
    "Facial distortion detected",
    "GAN-style texture artifacts",
    "Caption mismatch with visual content"
  ],
  "explanation": "This image shows several hallmarks of AI-generated or manipulated content..."
}
```

---

### `POST /url-check`

Check the credibility and safety of a URL.

**Request** — JSON body:

```json
{ "url": "https://example.com" }
```

**Response:**

```json
{
  "url": "https://example.com",
  "verdict": "suspicious",
  "risk_level": "high",
  "confidence": 78,
  "signals": [
    "Domain registered within the last 30 days",
    "No valid SSL certificate",
    "Flagged by 3 threat intelligence feeds"
  ],
  "explanation": "This URL exhibits multiple high-risk indicators..."
}
```

---

## Environment Variables

Copy `.env.example` to `.env` in the backend directory and fill in your keys:

```env
# Sightengine — image & video analysis
# https://sightengine.com
SIGHTENGINE_API_USER=
SIGHTENGINE_API_SECRET=

# GPTZero — AI text detection
# https://gptzero.me
GPTZERO_API_KEY=

# Anthropic Claude — context analysis
# https://console.anthropic.com
ANTHROPIC_API_KEY=

# URLScan.io — URL sandbox analysis
# https://urlscan.io
URLSCAN_API_KEY=

# Google Safe Browsing — URL threat intelligence
# https://developers.google.com/safe-browsing
GOOGLE_SAFE_BROWSING_KEY=
```

> Without API keys, the backend runs in **demo mode** and returns realistic mock verdicts. All endpoints still respond correctly — useful for UI development and demos.

---

## Extension Features (Verifai Lens)

The Chrome extension adds verification capabilities directly to the browser:

- **Text selection** — select any text on a webpage (20+ characters) and a floating "Verify" button appears. Click it to get an instant AI-detection verdict in an overlay panel.
- **Right-click context menu** — right-click any selected text, image, or link to send it to Verifai for analysis.
- **Auto URL check** — every page you visit is automatically checked against the URL credibility endpoint. A warning badge appears on the extension icon for high-risk pages.
- **Popup (3 tabs)**:
  - *Current Page* — shows the stored verdict for the active tab's URL with a "Re-check" button
  - *Check Text* — paste any text for manual analysis
  - *Check URL* — enter any URL for manual credibility check

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite 5, React 18, TypeScript, React Router v6, TanStack Query |
| **UI** | Tailwind CSS, shadcn/ui (Radix UI primitives), Lucide icons |
| **Backend** | FastAPI, Python 3.11+, uvicorn, Pydantic v2, httpx |
| **File Handling** | PyMuPDF (PDF parsing), python-multipart (file uploads) |
| **Extension** | Vanilla JS, Chrome Manifest V3, service worker |
| **AI Services** | Sightengine, GPTZero, Anthropic Claude, URLScan.io, Google Safe Browsing |

---

## Current State

| Component | Status | Notes |
|---|---|---|
| Frontend | Ready | `npm run dev` works immediately |
| Backend | Ready (demo mode) | `uvicorn main:app --reload` works; returns mock data without API keys |
| Extension | Blocked | Requires icon files in `extension/icons/` before Chrome can load it |
| AI integrations | Stubbed | Real API calls are written but commented out pending key setup |

---

## Team

Built for the **MenaCraft Hackathon 2026**.
