const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export interface ProviderInfo {
  id: string;
  name: string;
  auth_mode: "oauth" | "mock";
  ready: boolean;
  notes: string[];
}

export interface MailboxSessionResponse {
  session_id: string;
  provider: string;
  email_address: string | null;
  status: "demo" | "connected";
  message: string;
}

export interface EmailAttachment {
  filename: string;
  mime_type: string | null;
  size: number | null;
}

export interface EmailMessageSummary {
  id: string;
  thread_id: string | null;
  subject: string;
  from: string;
  snippet: string;
  received_at: string | null;
  labels: string[];
}

export interface EmailMessageDetail extends EmailMessageSummary {
  to: string[];
  cc: string[];
  body_text: string;
  body_html: string | null;
  links: string[];
  attachments: EmailAttachment[];
  raw_headers: Record<string, string>;
}

export interface RiskScores {
  ai_generated: number;
  manipulated_reality: number;
  misleading_context: number;
  source_credibility_risk: number;
}

export interface EvidenceItem {
  label: string;
  detail: string;
  score_impact: number;
}

export interface AnalysisResult {
  id: string;
  source_type: string;
  source_id: string | null;
  verdict: "likely_authentic" | "needs_review" | "suspicious";
  confidence: number;
  summary: string;
  model_mode: "heuristic" | "remote_model";
  risk_scores: RiskScores;
  evidence: EvidenceItem[];
  content_preview: string;
  created_at: string;
}

export interface OAuthStartResponse {
  provider: string;
  authorization_url: string;
  state: string;
  redirect_uri: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch {
    throw new Error(
      `Could not reach the Verifai backend. Start the FastAPI server on http://127.0.0.1:8000 and refresh the page.`,
    );
  }

  if (!response.ok) {
    const rawBody = await response.text();
    let detail = "Request failed.";
    try {
      const payload = rawBody ? JSON.parse(rawBody) : null;
      detail = payload.detail ?? detail;
    } catch {
      detail = rawBody || detail;
    }
    throw new Error(detail || "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const verifaiApi = {
  apiBaseUrl: API_BASE_URL,
  listProviders: () => request<ProviderInfo[]>("/auth/providers"),
  connectMockMailbox: () => request<MailboxSessionResponse>("/auth/mock/connect", { method: "POST" }),
  startGmailOAuth: () => request<OAuthStartResponse>("/auth/gmail/start"),
  getSessionStatus: (sessionId: string) => request<MailboxSessionResponse>(`/auth/sessions/${sessionId}`),
  listEmails: (sessionId: string, limit = 10) =>
    request<EmailMessageSummary[]>(`/emails?session_id=${encodeURIComponent(sessionId)}&limit=${limit}`),
  getEmail: (sessionId: string, emailId: string) =>
    request<EmailMessageDetail>(`/emails/${encodeURIComponent(emailId)}?session_id=${encodeURIComponent(sessionId)}`),
  analyzeEmail: (sessionId: string, emailId: string) =>
    request<AnalysisResult>(`/analysis/email/${encodeURIComponent(emailId)}?session_id=${encodeURIComponent(sessionId)}`, {
      method: "POST",
    }),
};
