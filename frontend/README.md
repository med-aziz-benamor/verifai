# Verifai — Frontend

Vite + React 18 + TypeScript web application for the Verifai content verification platform.

## Stack

- **Vite 5** — build tool, dev server on port 8080
- **React 18** + **TypeScript**
- **React Router v6** — client-side routing
- **TanStack Query** — server state management
- **Tailwind CSS** + **shadcn/ui** — UI components (Radix UI primitives)
- **Sonner** — toast notifications
- **Lucide React** — icons

## Setup

```bash
npm install
npm run dev       # http://localhost:8080
npm run build     # production build
npm run preview   # preview production build
```

The dev server proxies `/api/*` → `http://localhost:8000` (FastAPI backend). See `vite.config.ts`.

## Pages

| Route | Component | Description |
|---|---|---|
| `/` | `Index.tsx` | Landing / marketing page |
| `/dashboard` | `Dashboard.tsx` | Upload → analyze → result flow |
| `/extension` | `Extension.tsx` | Extension info and install guide |
| `*` | `NotFound.tsx` | 404 page |

## Key Files

- `src/lib/api.ts` — typed API client (`analyzeContent`, `checkUrl`)
- `src/components/` — all UI components
- `src/components/ui/` — auto-generated shadcn/ui base components
