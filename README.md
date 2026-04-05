# Verifai — See Through the Noise

> AI-powered content verification platform that detects misinformation, AI-generated media, deepfakes, and suspicious URLs in real time — built for the **MenaCraft Hackathon 2026**.

---

## What is Verifai?

Verifai is a full-stack misinformation detection system with three integrated layers:

| Layer | Description |
|---|---|
| **Backend API** | FastAPI service orchestrating multiple AI models for text, image, and URL analysis |
| **Web Dashboard** | React + TypeScript interface for drag-and-drop file, text, and URL verification |
| **Browser Extension** | Chrome/Firefox MV3 extension that brings verification directly into your browsing — including Facebook comment analysis |

The core idea: instead of asking users to visit a fact-checking site, bring the verification tools to wherever the content lives — whether that's a news article, a social media post, or an image shared in a chat.

---

## Features at a Glance

### Text Analysis
- **HuggingFace RoBERTa** (`chatgpt-detector-roberta`) — pattern-based AI text probability scoring
- **Groq Llama 3.3 70B** — reasoning-based contextual analysis with calibrated scoring rules
- **Score fusion** — weighted combination based on model agreement (the closer the models agree, the more evenly weighted)
- Catches: repetitive transitional phrases, uniform sentence length, absence of personal voice, overly generic register
- Verdicts: `authentic` · `likely_authentic` · `suspicious` · `ai_generated`

### Image & Deepfake Detection
- **Sightengine** multi-model pipeline: `genai` + `deepfake` + `faces`
- Per-face deepfake scoring and facial geometry inconsistency detection
- Detects: GAN artifacts, texture anomalies, AI synthesis signatures, facial warping

### URL Credibility Checking
- **Domain heuristics** — instant checks: suspicious TLDs, IP-address URLs, excessive subdomains, missing SSL
- **Google Safe Browsing** — real-time malware, phishing, and unwanted software flags
- **URLScan.io** — full sandbox analysis with threat scoring
- Risk levels: `low` · `medium` · `high`

### PDF Analysis
- Text extraction via PyMuPDF, fed into the text analysis pipeline

### Browser Extension (Verifai Lens)
- Floating "Verify" button on any text selection (20+ characters)
- Right-click context menu for text, images, and links
- Auto URL check on every page navigation with warning badge for high-risk pages
- 3-tab popup: **Current Page** · **Check Text** · **Check URL**
- **Facebook platform integration** — "Verify Comment" button injected natively into posts and comments, popup with AI text score, context match bar, verdict badge, and detected signals
- Full analysis report page (exportable as PDF or plain text)

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                          Browser                               │
│  ┌───────────────┐   ┌──────────────────┐   ┌──────────────┐  │
│  │  Extension    │   │  Web Dashboard   │   │ Report Page  │  │
│  │  (MV3)        │   │  (React / Vite)  │   │ (Extension)  │  │
│  └──────┬────────┘   └────────┬─────────┘   └──────────────┘  │
└─────────┼────────────────────┼────────────────────────────────┘
          │ sendMessage relay  │ /api proxy (Vite dev server)
          │ bypasses page CSP  │
          ▼                    ▼
┌────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                            │
│                    http://localhost:8000                        │
│                                                                │
│   POST /analyze            POST /analyze-image-base64          │
│   POST /url-check          GET  /health                        │
│                                                                │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  text_analysis  │  │ image_analysis   │  │ url_analysis │  │
│  │                 │  │                  │  │              │  │
│  │  HuggingFace    │  │  Sightengine     │  │ Google Safe  │  │
│  │  RoBERTa        │  │  genai + deepf.  │  │ Browsing     │  │
│  │  +              │  │  + face detect.  │  │ +            │  │
│  │  Groq Llama 70B │  │                  │  │ URLScan.io   │  │
│  │  Score fusion   │  │                  │  │ + Heuristics │  │
│  └─────────────────┘  └──────────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
verifai/
│
├── backend/                          # FastAPI backend (Python 3.11+)
│   ├── main.py                       # App entry point, CORS, router registration
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # API key template (safe to commit)
│   ├── routes/
│   │   ├── analyze.py                # POST /analyze, POST /analyze-image-base64
│   │   └── url_check.py              # POST /url-check
│   └── services/
│       ├── text_analysis.py          # HuggingFace + Groq pipeline + score fusion
│       ├── image_analysis.py         # Sightengine integration + signal extraction
│       └── url_analysis.py           # Heuristics + Google Safe Browsing + URLScan.io
│
├── frontend/                         # React + TypeScript dashboard
│   ├── vite.config.ts                # Dev server + /api proxy → localhost:8000
│   ├── tailwind.config.ts            # Custom color tokens (verified/suspicious/manipulated)
│   └── src/
│       ├── pages/
│       │   ├── Index.tsx             # Landing / marketing page
│       │   ├── Dashboard.tsx         # Upload → analyze → result state machine
│       │   ├── Extension.tsx         # Extension installation guide
│       │   └── NotFound.tsx          # 404 page
│       ├── components/
│       │   ├── UploadCard.tsx        # File / text / URL input switcher
│       │   ├── ResultCard.tsx        # Verdict, scores, signals, explanation
│       │   ├── ScoreBar.tsx          # Animated confidence progress bar
│       │   ├── VerdictBadge.tsx      # Color-coded verdict chip
│       │   ├── LoadingState.tsx      # Analysis in-progress animation
│       │   ├── UrlRiskBanner.tsx     # URL risk summary card
│       │   └── ui/                   # 50+ shadcn/ui base components
│       └── lib/
│           └── api.ts                # Typed API client (analyzeContent, checkUrl)
│
├── extension/                        # Browser extension (Chrome MV3 / Firefox)
│   ├── manifest.json                 # Permissions, content scripts, service worker
│   ├── background.js                 # Service worker: context menus, URL checks, message relay
│   ├── content.js                    # Text selection button, overlay, URL credibility banner
│   ├── popup/
│   │   ├── popup.html                # 3-tab popup UI (Current Page / Check Text / Check URL)
│   │   └── popup.js                  # Tab logic, API calls, result rendering
│   ├── report/
│   │   ├── report.html               # Full analysis report page (8 sections)
│   │   └── report.js                 # Report rendering, PDF export, clipboard copy
│   ├── platforms/
│   │   └── facebook.js               # Facebook comment verification injection
│   └── icons/                        # Extension icons (16, 32, 48, 128px + logo.png)
│
└── generate_icons.py                 # Generates extension icon set from SVG
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend language | Python | 3.11+ |
| Backend framework | FastAPI | 0.111.0+ |
| Backend server | Uvicorn (ASGI) | 0.29.0+ |
| Backend validation | Pydantic | v2.7.1+ |
| HTTP client | httpx | 0.27.0+ |
| PDF extraction | PyMuPDF | 1.24.3 |
| Frontend framework | React | 18.3.1 |
| Frontend language | TypeScript | 5.8.3 |
| Frontend bundler | Vite | 5.4.19 |
| Frontend router | React Router | 6.30.1 |
| Frontend styling | Tailwind CSS | 3.4.17 |
| UI components | shadcn/ui (Radix UI) | — |
| Data fetching | TanStack React Query | 5.83.0 |
| Form handling | React Hook Form + Zod | 7.61.1 + 3.25.76 |
| Charts | Recharts | 2.15.4 |
| Unit testing | Vitest | 3.2.4 |
| E2E testing | Playwright | 1.57.0 |
| Extension type | Chrome Manifest V3 | — |
| Extension language | Vanilla JavaScript | ES2020 |

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Chrome or Firefox

### 1 · Clone

```bash
git clone <repo-url>
cd verifai
```

### 2 · Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in API keys (see Environment Variables)
uvicorn main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**  
Swagger UI at **http://localhost:8000/docs**

### 3 · Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard runs at **http://localhost:8080**  
All `/api/*` requests are proxied to the backend automatically.

### 4 · Browser Extension

Generate icons first (required once):

```bash
python generate_icons.py
```

**Chrome:**
1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select the `extension/` folder

**Firefox:**
1. `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on** → select `extension/manifest.json`

---

## Environment Variables

Create `backend/.env` (all keys are optional — see demo mode below):

```env
# Sightengine — image & deepfake analysis
# Sign up: https://sightengine.com  (free tier: 500 ops/month)
SIGHTENGINE_API_USER=
SIGHTENGINE_API_SECRET=

# HuggingFace — RoBERTa AI text detector
# Get free token: https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=

# Groq — Llama 3.3 70B context analysis
# Free key: https://console.groq.com
GROQ_API_KEY=

# URLScan.io — URL sandbox analysis
# Free account: https://urlscan.io
URLSCAN_API_KEY=

# Google Safe Browsing — threat intelligence
# Enable at: https://console.cloud.google.com → Safe Browsing API
GOOGLE_SAFE_BROWSING_KEY=
```

> **Demo mode:** Without API keys the backend still runs and responds on all endpoints. Services that require keys return graceful fallbacks or partial results — useful for UI development and live demos.

---

## API Reference

### `GET /health`

```json
{ "status": "ok", "service": "Verifai API" }
```

---

### `POST /analyze`

Analyze a file (image or PDF) or raw text.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | One of | JPEG / PNG / WebP / GIF / PDF |
| `text` | string | One of | Raw text to analyze |
| `page_url` | string | No | Source URL for context scoring |

**Response:**

```json
{
  "verdict": "suspicious",
  "confidence": 73,
  "content_type": "text",
  "scores": {
    "ai_generated": 78,
    "context_match": 41
  },
  "signals": [
    "Repetitive transitional phrases: Furthermore, Additionally",
    "Unusually uniform sentence length throughout"
  ],
  "explanation": "The text shows several hallmarks of AI generation..."
}
```

---

### `POST /analyze-image-base64`

Analyze a base64-encoded image. Used by the browser extension to bypass cross-origin Content Security Policies.

**Request:** `application/json`

```json
{
  "image_base64": "<base64 string>",
  "filename": "image.jpg"
}
```

Response schema is identical to `/analyze`.

---

### `POST /url-check`

Check a URL for credibility and threats.

**Request:** `application/json`

```json
{ "url": "https://example.com" }
```

**Response:**

```json
{
  "url": "https://example.com",
  "verdict": "suspicious",
  "risk_level": "high",
  "confidence": 82,
  "signals": [
    "Suspicious top-level domain: .xyz",
    "No valid SSL certificate",
    "Flagged by Google Safe Browsing: Malware"
  ],
  "explanation": "This domain exhibits multiple high-risk indicators..."
}
```

---

## Verdict Reference

| Verdict | Meaning |
|---|---|
| `authentic` | Content is very likely human-written or genuine |
| `likely_authentic` | Probably genuine, minor uncertainty |
| `suspicious` | Mixed signals — warrants caution |
| `ai_generated` | Strong indicators of AI generation |
| `likely_manipulated` | Probable image or media manipulation |
| `safe` | URL is verified safe (risk_level = low) |
| `dangerous` | URL flagged by one or more threat feeds |
| `inconclusive` | Insufficient data to make a determination |

---

## Detection Methodology

### Text — Two-Model Pipeline

```
Input text (≥ 20 characters)
       │
       ├──► HuggingFace RoBERTa
       │      Hello-SimpleAI/chatgpt-detector-roberta
       │      Returns: P(AI) 0–100
       │
       └──► Groq Llama 3.3 70B
              Calibration rules applied:
                casual / imperfect / personal  →  human
                formal / uniform / generic     →  AI
              Returns: ai_confidence, context_confidence,
                       signals[], explanation
       │
       ▼
  Score Fusion
    |gap| < 20  →  35% HuggingFace + 65% Groq
    |gap| < 40  →  25% HuggingFace + 75% Groq
    |gap| ≥ 40  →  100% Groq  (strong disagreement)
       │
       ▼
  verdict + confidence + signals + explanation
```

### Image — Sightengine Pipeline

```
Input image (bytes or base64)
       │
       └──► Sightengine API  (models: genai, deepfake, faces)
              Returns:
                ai_generated score (0.0–1.0)
                deepfake score     (0.0–1.0)
                per-face scores
                facial geometry check
       │
       ▼
  Signal extraction
    ai_score > 0.70    →  "Strong AI generation signature detected"
    deepfake > 0.70    →  "Facial deepfake indicators present"
    face geometry      →  "Facial geometry inconsistencies detected"
       │
       ▼
  verdict + confidence + signals
```

### URL — Three-Layer Pipeline

```
Input URL
       │
       ├──► Heuristics (instant, zero latency)
       │      IP address as hostname
       │      Suspicious TLD (.xyz .tk .ml .ga .cf .gq .top .click)
       │      Excessive subdomains (> 3 dots)
       │      No HTTPS
       │
       ├──► Google Safe Browsing
       │      MALWARE · SOCIAL_ENGINEERING
       │      UNWANTED_SOFTWARE · POTENTIALLY_HARMFUL
       │      → If flagged: immediate high-risk verdict, skip URLScan
       │
       └──► URLScan.io  (only if GSB clean)
              Submit → 10s wait → fetch results
              Returns: verdict score, malicious flag, tags
       │
       ▼
  risk_level (low / medium / high) + signals + explanation
```

---

## Extension Deep Dive

### Content Security Policy Problem — and How It's Solved

Facebook (and many other sites) enforce strict `Content-Security-Policy: connect-src` headers that block direct `fetch()` calls from content scripts to external origins — including `http://localhost:8000`.

**Solution:** all API calls in content scripts are routed through `background.js` using `chrome.runtime.sendMessage`. The service worker is not subject to page-level CSPs and can fetch freely.

```
facebook.js (content script)
    │
    │  sendMessage({ type: 'VERIFAI_CHECK_TEXT', text })
    ▼
background.js (service worker — no CSP restrictions)
    │
    │  fetch('http://localhost:8000/analyze', ...)
    ▼
FastAPI backend
    │
    │  sendResponse(result)
    ▼
facebook.js receives result → renders popup
```

### Message Types

| Message | Direction | Purpose |
|---|---|---|
| `VERIFAI_CHECK_TEXT` | content → background | Analyze text via `/analyze` |
| `VERIFAI_CHECK_IMAGE_BASE64` | content → background | Analyze image via `/analyze-image-base64` |
| `VERIFAI_CHECK_URL` | content → background | Check URL via `/url-check` |
| `VERIFAI_OPEN_REPORT` | content → background | Open full report in new tab |
| `VERIFAI_RESULT` | background → content | Push analysis result to overlay |
| `VERIFAI_URL_RESULT` | background → content | Push URL result for credibility banner |
| `VERIFAI_LOADING` | background → content | Show loading state in overlay |

### Facebook Integration

Facebook uses `role="article"` for both top-level posts and nested comment threads. The injection script:

1. Scans for all `[role="article"]` elements on load (2s and 5s delayed scans + `MutationObserver` for infinite scroll)
2. Marks each with `data-verifai-done` to prevent double injection
3. Appends a "Verify Comment" button styled to match Facebook's native action bar (`#F0F2F5` background, `#65676B` text, `border-radius: 4px`)
4. On click, extracts the longest `div[dir="auto"]` text block
5. Routes text through `background.js` → `POST /analyze` → result popup (fixed right-side panel with verdict badge, AI score bar, context match bar, signals, explanation)

### URL Credibility Banner

On every page navigation `background.js` calls `POST /url-check` on the current URL. Results are:
- Stored in `browser.storage.local` for the popup to read
- Pushed to `content.js` via `VERIFAI_URL_RESULT` message
- Rendered as a fixed top-right pill card with risk indicator, domain name, and expandable 2×2 details grid (Domain Age · Reputation · Known Flags · SSL)
- The extension icon gets a `!` amber badge if `risk_level === 'high'`

### Full Report Page

After any analysis, clicking **Full Report** saves the result to `browser.storage.local` and opens `report/report.html` in a new tab. The report has 8 sections:

1. Header with timestamp
2. Analyzed content preview
3. Overall verdict with large confidence %
4. Score breakdown with animated bars
5. Detected signals list
6. Full AI explanation paragraph
7. Detection methods used (HuggingFace + Groq status)
8. Actions: Export PDF (via `window.print()`) · Copy Report (plain text to clipboard) · Close

---

## Signal Reference

### Text Signals
- `Repetitive transitional phrases: Furthermore, Additionally, In conclusion`
- `Unusually uniform sentence length throughout`
- `Generic informational tone with no personal voice`
- `Predictable corporate vocabulary`
- `Casual conversational tone with informal grammar` *(human indicator)*
- `Personal anecdote with natural imperfections` *(human indicator)*
- `Colloquial expressions and sentence fragments` *(human indicator)*
- `Mixed signals — moderate confidence only` *(model disagreement)*
- `Detectors disagree — Groq analysis used` *(strong disagreement)*

### Image Signals
- `Strong AI generation signature detected`
- `Facial deepfake indicators present`
- `Facial geometry inconsistencies detected`
- `Moderate AI generation probability`
- `GAN-style texture artifacts`

### URL Signals
- `IP address used instead of domain name — common in phishing`
- `Suspicious top-level domain: .xyz`
- `No valid SSL certificate — connection is not encrypted`
- `Excessive subdomains — possible phishing pattern`
- `Flagged by Google Safe Browsing: Social Engineering`
- `URLScan malicious verdict`

---

## Development Scripts

### Backend
```bash
uvicorn main:app --reload               # Dev server with auto-reload on :8000
uvicorn main:app --reload --port 8001   # Custom port
```

### Frontend
```bash
npm run dev       # Vite dev server on :8080 with /api proxy
npm run build     # Production build → /dist
npm run preview   # Preview production build locally
npm run lint      # ESLint
npm run test      # Vitest unit tests
npm run test:e2e  # Playwright end-to-end tests
```

---

## Adding a New Platform

To extend the extension to a new social platform (e.g. Twitter/X, LinkedIn):

1. Create `extension/platforms/<platform>.js` following the pattern in `facebook.js`
2. Add a `content_scripts` entry in `manifest.json`:
   ```json
   {
     "matches": ["*://*.twitter.com/*"],
     "js": ["platforms/twitter.js"],
     "run_at": "document_idle"
   }
   ```
3. Add the host to `host_permissions` in `manifest.json`
4. Route all API calls through `background.js` using `sendMessage` (required to bypass CSPs)

---

## Adding a New Analysis Service

1. Create `backend/services/<service_name>.py`
2. Implement an `async def analyze_<type>(...)` function returning the standard verdict dict
3. Import and call it from the relevant route in `backend/routes/`
4. Add the API key to `backend/.env.example` with a comment and sign-up URL

---

## License

Built for the **MenaCraft Hackathon 2026**. All rights reserved.
