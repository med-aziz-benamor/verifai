import VerdictBadge from "./VerdictBadge";
import SignalChip from "./SignalChip";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { AnalysisResult, EmailMessageDetail } from "@/lib/verifai-api";
import { Copy, RotateCcw, ChevronDown, ChevronUp, Mail, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { useMemo, useState } from "react";

interface ResultCardProps {
  result: AnalysisResult;
  email?: EmailMessageDetail | null;
  className?: string;
  onReset?: () => void;
}

type VerdictTone = "verified" | "review" | "suspicious" | "manipulated";

const ResultCard = ({ result, email, className, onReset }: ResultCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const presentation = useMemo(() => {
    if (result.verdict === "likely_authentic") {
      return {
        badge: "verified" as VerdictTone,
        headline: "This looks safe to trust",
        guidance: "We did not find strong signs of manipulation or misleading framing in this message.",
        icon: ShieldCheck,
        iconClass: "text-verified",
        panelClass: "bg-verified/8 border-verified/20",
      };
    }

    if (result.verdict === "needs_review") {
      return {
        badge: "review" as VerdictTone,
        headline: "Be careful before trusting this",
        guidance: "Some parts look questionable, so it is better to pause and double-check before you rely on it or share it.",
        icon: ShieldAlert,
        iconClass: "text-primary",
        panelClass: "bg-primary/6 border-primary/20",
      };
    }

    if (result.risk_scores.manipulated_reality >= 75) {
      return {
        badge: "manipulated" as VerdictTone,
        headline: "This may be manipulated",
        guidance: "The message shows strong warning signs that the content may alter reality, mislead the viewer, or present false evidence.",
        icon: ShieldX,
        iconClass: "text-manipulated",
        panelClass: "bg-manipulated/8 border-manipulated/20",
      };
    }

    return {
      badge: "suspicious" as VerdictTone,
      headline: "This does not look trustworthy yet",
      guidance: "We found enough warning signs that you should not trust this message without checking other reliable sources.",
      icon: ShieldAlert,
      iconClass: "text-suspicious",
      panelClass: "bg-suspicious/8 border-suspicious/20",
    };
  }, [result]);

  const reasons = result.evidence.slice(0, 3).map((item) => item.label);

  const nextSteps = useMemo(() => {
    const actions = [];

    if (result.risk_scores.manipulated_reality >= 60) {
      actions.push("Do not treat the image, video, or claim as proof yet.");
    }
    if (result.risk_scores.misleading_context >= 45) {
      actions.push("Check whether the content is being reused in the wrong situation or time.");
    }
    if (result.risk_scores.source_credibility_risk >= 45) {
      actions.push("Look at the sender and links carefully before clicking or forwarding.");
    }
    if (result.risk_scores.ai_generated >= 45) {
      actions.push("Treat polished or dramatic wording with caution because it may be machine-generated.");
    }

    if (actions.length === 0) {
      actions.push("You can still use normal judgment, but no strong warning signs stood out here.");
    }

    return actions.slice(0, 3);
  }, [result]);

  const reportText = [
    presentation.headline,
    presentation.guidance,
    `Confidence: ${result.confidence}%`,
    `Summary: ${result.summary}`,
    `Top reasons: ${reasons.join(", ") || "No major warning signs found"}`,
    `Suggested next steps: ${nextSteps.join(" ")}`,
  ].join("\n");

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    toast.success("Summary copied");
  };

  const Icon = presentation.icon;

  return (
    <div className={cn("rounded-2xl bg-card shadow-card border border-border overflow-hidden animate-slide-up", className)}>
      <div className="p-6 border-b border-border flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", presentation.panelClass)}>
          <Icon className={cn("h-6 w-6", presentation.iconClass)} />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Verifai Verdict</p>
          <h3 className="text-2xl font-bold text-foreground">{presentation.headline}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{presentation.guidance}</p>
          <p className="text-sm text-muted-foreground">
            {email?.subject ?? "Selected message"} {email?.received_at ? `- ${new Date(email.received_at).toLocaleString()}` : ""}
          </p>
        </div>
        <VerdictBadge verdict={presentation.badge} size="lg" />
      </div>

      <div className="p-6 space-y-5">
        <div className={cn("rounded-2xl border p-5 space-y-3", presentation.panelClass)}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Trust confidence</p>
              <p className="text-sm text-muted-foreground">Higher means Verifai feels more confident about this verdict.</p>
            </div>
            <span className="text-3xl font-bold text-foreground">{result.confidence}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Why Verifai said this</p>
          <div className="flex flex-wrap gap-2">
            {reasons.length > 0 ? (
              reasons.map((reason) => (
                <SignalChip
                  key={reason}
                  label={reason}
                  type={presentation.badge === "verified" ? "success" : presentation.badge === "review" ? "info" : "warning"}
                />
              ))
            ) : (
              <SignalChip label="No major warning signs found" type="success" />
            )}
          </div>
        </div>

        <div className="rounded-xl bg-surface-elevated p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">What you should do next</p>
          <div className="space-y-2">
            {nextSteps.map((step) => (
              <p key={step} className="text-sm text-muted-foreground leading-relaxed">
                {step}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-surface-elevated p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Mail className="h-4 w-4 text-primary" />
            Message preview
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{result.content_preview}</p>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showDetails ? "Hide" : "Show"} more detail
        </button>

        {showDetails && (
          <div className="rounded-xl bg-surface-elevated p-4 space-y-4 animate-slide-up">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">AI-generated risk</p>
                <p className="font-medium text-foreground">{result.risk_scores.ai_generated}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Manipulation risk</p>
                <p className="font-medium text-foreground">{result.risk_scores.manipulated_reality}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Misleading context risk</p>
                <p className="font-medium text-foreground">{result.risk_scores.misleading_context}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Source risk</p>
                <p className="font-medium text-foreground">{result.risk_scores.source_credibility_risk}%</p>
              </div>
            </div>

            {result.evidence.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">More detail</p>
                <div className="space-y-2">
                  {result.evidence.map((item) => (
                    <div key={`${item.label}-${item.detail}`} className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={copyReport}>
            <Copy className="h-4 w-4" /> Copy Summary
          </Button>
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="h-4 w-4" /> Check Another Email
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
