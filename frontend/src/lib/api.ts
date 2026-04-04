// ============================================================
// Verifai API Client
// All calls go through the Vite dev proxy (/api → :8000)
// so no CORS issues in development.
// ============================================================

const BASE = "/api";

// ── Shared types ────────────────────────────────────────────

export type ContentType = "image" | "video" | "pdf" | "text";

export type Verdict =
  | "verified"
  | "likely_authentic"
  | "suspicious"
  | "likely_manipulated"
  | "ai_generated"
  | "manipulated";

export interface AnalysisResult {
  verdict: Verdict;
  confidence: number;
  content_type: ContentType;
  scores: {
    ai_generated: number;
    deepfake: number;
    manipulation: number;
    context_match: number;
  };
  signals: string[];
  explanation: string;
}

export interface UrlCheckResult {
  url: string;
  verdict: string;
  risk_level: "low" | "medium" | "high";
  confidence: number;
  signals: string[];
  explanation: string;
}

// ── Helpers ─────────────────────────────────────────────────

/** Map a raw backend verdict string to the three UI verdicts. */
export function normaliseVerdict(
  verdict: Verdict
): "verified" | "suspicious" | "manipulated" {
  if (verdict === "verified" || verdict === "likely_authentic") return "verified";
  if (verdict === "manipulated" || verdict === "likely_manipulated") return "manipulated";
  // suspicious, ai_generated, or anything else
  return "suspicious";
}

/** Map a URL risk level to a UI colour key. */
export function riskToVerdict(
  risk: "low" | "medium" | "high"
): "verified" | "suspicious" | "manipulated" {
  if (risk === "low") return "verified";
  if (risk === "medium") return "suspicious";
  return "manipulated";
}

// ── API calls ────────────────────────────────────────────────

/**
 * POST /analyze
 * Accepts either a File object (media / PDF) or a plain text string.
 */
export async function analyzeContent(
  input: File | string
): Promise<AnalysisResult> {
  const form = new FormData();

  if (typeof input === "string") {
    form.append("text", input);
  } else {
    form.append("file", input);
  }

  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Analysis failed");
  }

  return res.json() as Promise<AnalysisResult>;
}

/**
 * POST /url-check
 * Accepts a URL string and returns a credibility verdict.
 */
export async function checkUrl(url: string): Promise<UrlCheckResult> {
  const res = await fetch(`${BASE}/url-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "URL check failed");
  }

  return res.json() as Promise<UrlCheckResult>;
}
