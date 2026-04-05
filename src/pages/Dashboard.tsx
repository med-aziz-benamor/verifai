import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmailBodyPreview from "@/components/EmailBodyPreview";
import LoadingState from "@/components/LoadingState";
import ResultCard from "@/components/ResultCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { verifaiApi, type AnalysisResult, type EmailMessageDetail, type EmailMessageSummary, type MailboxSessionResponse, type ProviderInfo } from "@/lib/verifai-api";
import { AlertCircle, Inbox, MailOpen, RefreshCw, ShieldCheck, Sparkles, Unplug } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const SESSION_STORAGE_KEY = "verifai-mail-session-id";

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [session, setSession] = useState<MailboxSessionResponse | null>(null);
  const [emails, setEmails] = useState<EmailMessageSummary[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessageDetail | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisEmail, setAnalysisEmail] = useState<EmailMessageDetail | null>(null);
  const [mailboxLoading, setMailboxLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openRequestRef = useRef(0);

  const resetMailboxState = useCallback(() => {
    setSession(null);
    setEmails([]);
    setSelectedEmail(null);
    setAnalysis(null);
    setAnalysisEmail(null);
  }, []);

  const openEmail = useCallback(async (sessionId: string, emailId: string, resetResult = true) => {
    const requestId = ++openRequestRef.current;

    try {
      const email = await verifaiApi.getEmail(sessionId, emailId);
      if (requestId !== openRequestRef.current) return;

      setSelectedEmail(email);
      if (resetResult) {
        setAnalysis(null);
        setAnalysisEmail(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verifai could not open that message.";
      setError(message);
      toast.error("Could not open email", { description: message });
    }
  }, []);

  const loadEmails = useCallback(async (sessionId: string) => {
    setMailboxLoading(true);
    setError(null);

    try {
      const inbox = await verifaiApi.listEmails(sessionId);
      setEmails(inbox);

      if (inbox.length === 0) {
        setSelectedEmail(null);
        setAnalysis(null);
        setAnalysisEmail(null);
        return;
      }

      const emailToOpen = selectedEmail && inbox.some((item) => item.id === selectedEmail.id)
        ? selectedEmail.id
        : inbox[0].id;

      if (!analysisLoading) {
        await openEmail(sessionId, emailToOpen, false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verifai could not load your inbox.";
      setError(message);
      toast.error("Inbox unavailable", { description: message });
    } finally {
      setMailboxLoading(false);
    }
  }, [analysisLoading, openEmail, selectedEmail]);

  const restoreSession = useCallback(async (sessionId: string) => {
    setMailboxLoading(true);
    setError(null);

    try {
      const nextSession = await verifaiApi.getSessionStatus(sessionId);
      setSession(nextSession);
      await loadEmails(nextSession.session_id);
    } catch (err) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      const message = err instanceof Error ? err.message : "Your mailbox session could not be restored.";
      setError(message);
      resetMailboxState();
    } finally {
      setMailboxLoading(false);
    }
  }, [loadEmails, resetMailboxState]);

  useEffect(() => {
    const boot = async () => {
      try {
        const providerList = await verifaiApi.listProviders();
        setProviders(providerList);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load connection options.";
        setError(message);
      } finally {
        setProvidersLoading(false);
      }

      const callbackSessionId = searchParams.get("session_id");
      const authState = searchParams.get("mail_auth");
      const authError = searchParams.get("mail_error");
      const authDetail = searchParams.get("mail_detail");

      if (authState === "success" && callbackSessionId) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, callbackSessionId);
        toast.success("Gmail connected", { description: "Your inbox is ready for review." });
        await restoreSession(callbackSessionId);
        setSearchParams({}, { replace: true });
        return;
      }

      if (authState === "error") {
        const description = authDetail
          ?? (authError === "gmail_token_exchange_failed"
            ? "Google sign-in finished, but Verifai could not complete the connection."
            : "Verifai could not finish the Gmail connection.");

        toast.error("Gmail connection failed", {
          description,
        });
        setError(description);
        setSearchParams({}, { replace: true });
      }

      const savedSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSessionId) {
        await restoreSession(savedSessionId);
      }
    };

    void boot();
  }, [restoreSession, searchParams, setSearchParams]);

  const connectDemoMailbox = async () => {
    setMailboxLoading(true);
    setError(null);

    try {
      const nextSession = await verifaiApi.connectMockMailbox();
      setSession(nextSession);
      window.localStorage.setItem(SESSION_STORAGE_KEY, nextSession.session_id);
      toast.success("Demo inbox ready", { description: "You can now test how Verifai reviews messages." });
      await loadEmails(nextSession.session_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The demo inbox could not be connected.";
      setError(message);
      toast.error("Connection failed", { description: message });
    } finally {
      setMailboxLoading(false);
    }
  };

  const connectGmail = async () => {
    setError(null);
    try {
      const response = await verifaiApi.startGmailOAuth();
      window.location.assign(response.authorization_url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gmail could not be connected right now.";
      setError(message);
      toast.error("Gmail is not ready", { description: message });
    }
  };

  const analyzeSelectedEmail = async () => {
    if (!session || !selectedEmail) return;

    const emailUnderReview = selectedEmail;
    setAnalysisLoading(true);
    setError(null);
    setAnalysisEmail(emailUnderReview);

    try {
      const nextAnalysis = await verifaiApi.analyzeEmail(session.session_id, emailUnderReview.id);
      setAnalysis(nextAnalysis);
      toast.success("Check complete", { description: "Verifai reviewed the selected email." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verifai could not finish the review.";
      setError(message);
      setAnalysisEmail(null);
      toast.error("Review failed", { description: message });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const disconnectMailbox = () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    resetMailboxState();
    toast.success("Mailbox disconnected");
  };

  const gmailProvider = providers.find((provider) => provider.id === "gmail");
  const gmailReady = gmailProvider?.ready ?? false;
  const providerFetchWorked = providers.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        <div className="space-y-2 max-w-3xl">
          <h1 className="text-2xl font-bold font-display text-foreground">Check if an email can be trusted</h1>
          <p className="text-sm text-muted-foreground">
            Connect an inbox, pick a message, and let Verifai tell you whether it looks safe, suspicious, or possibly manipulated.
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Simple trust check
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Start with Gmail or try the demo inbox</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The goal is simple: help someone quickly understand whether they should trust what they are seeing, pause and double-check, or stay alert.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="accent" size="lg" onClick={connectDemoMailbox} disabled={mailboxLoading}>
                <Inbox className="h-4 w-4" />
                Try Demo Inbox
              </Button>
              <Button variant="outline" size="lg" onClick={connectGmail} disabled={!gmailReady || mailboxLoading || providersLoading}>
                <ShieldCheck className="h-4 w-4" />
                Connect Gmail
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">1. Connect</p>
              <p className="mt-1 text-sm text-muted-foreground">Link Gmail or use the demo inbox.</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">2. Pick a message</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose the email you want Verifai to review.</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">3. Get a clear answer</p>
              <p className="mt-1 text-sm text-muted-foreground">See whether it looks trustworthy and why.</p>
            </div>
          </div>

          {providersLoading && (
            <LoadingState title="Preparing connection options" subtitle="Checking available mailbox connections." className="border-0 shadow-none p-0" />
          )}

          {!providersLoading && providerFetchWorked && !gmailReady && (
            <div className="rounded-xl border border-suspicious/20 bg-suspicious/5 p-4 text-sm text-suspicious">
              Gmail is not configured yet. Add your Google client ID and secret in `backend/.env`, then restart the backend.
            </div>
          )}

          {session && (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-elevated p-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Connected mailbox</p>
                <p className="text-sm text-muted-foreground">
                  {session.email_address ?? "Demo inbox"} - {session.provider === "mock" ? "Demo mode" : "Gmail connected"}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => void loadEmails(session.session_id)} disabled={mailboxLoading || analysisLoading}>
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
                <Button variant="ghost" size="sm" onClick={disconnectMailbox} disabled={analysisLoading}>
                  <Unplug className="h-4 w-4" /> Disconnect
                </Button>
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-2xl border border-manipulated/20 bg-manipulated/5 p-4 text-sm text-manipulated">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {mailboxLoading && !session && (
          <LoadingState
            title="Opening mailbox"
            subtitle="Bringing your messages into Verifai."
            steps={["Connecting your mailbox", "Loading recent emails", "Getting things ready"]}
          />
        )}

        {session && (
          <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
              <div className="border-b border-border p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Inbox</p>
                <h2 className="mt-1 text-lg font-bold text-foreground">Choose an email</h2>
                <p className="text-sm text-muted-foreground">{emails.length} message{emails.length === 1 ? "" : "s"} available</p>
              </div>

              <div className="max-h-[640px] overflow-y-auto p-3 space-y-3">
                {mailboxLoading && emails.length === 0 ? (
                  <LoadingState
                    title="Loading emails"
                    subtitle="Pulling your recent messages into the dashboard."
                    className="border-0 shadow-none p-4"
                  />
                ) : emails.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No emails are available in this mailbox yet.
                  </div>
                ) : (
                  emails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => session && !analysisLoading && void openEmail(session.session_id, email.id)}
                      disabled={analysisLoading}
                      className={cn(
                        "w-full rounded-xl border p-4 text-left transition-colors",
                        selectedEmail?.id === email.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/30 hover:bg-accent/5",
                        analysisLoading && "cursor-not-allowed opacity-70"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-foreground line-clamp-2">{email.subject}</p>
                        <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                      <p className="mt-2 text-xs font-medium text-muted-foreground break-all">{email.from}</p>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{email.snippet}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              {selectedEmail ? (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Selected email</p>
                    <h2 className="text-xl font-bold text-foreground">{selectedEmail.subject}</h2>
                    <p className="text-sm text-muted-foreground break-all">
                      From {selectedEmail.from}
                    </p>
                  </div>

                  <EmailBodyPreview email={selectedEmail} />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-surface-elevated p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Links</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{selectedEmail.links.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-elevated p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Attachments</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{selectedEmail.attachments.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-elevated p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Sender</p>
                      <p className="mt-2 text-sm font-bold text-foreground line-clamp-2">{selectedEmail.from}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button variant="accent" size="lg" onClick={analyzeSelectedEmail} disabled={analysisLoading}>
                      <ShieldCheck className="h-4 w-4" />
                      Check This Email
                    </Button>
                    {analysis && (
                      <Button variant="outline" size="lg" onClick={() => {
                        setAnalysis(null);
                        setAnalysisEmail(null);
                      }}>
                        Clear Result
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  Choose an email and Verifai will explain whether it looks trustworthy.
                </div>
              )}

              {analysisLoading && (
                <LoadingState
                  title="Checking this email"
                  subtitle="Looking for manipulation, AI generation, and misleading framing."
                  steps={["Reading the message", "Checking warning signs", "Preparing a clear answer"]}
                />
              )}

              {analysis && (
                <ResultCard
                  result={analysis}
                  email={analysisEmail ?? selectedEmail}
                  onReset={() => {
                    setAnalysis(null);
                    setAnalysisEmail(null);
                  }}
                />
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
