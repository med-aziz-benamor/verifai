import VerdictBadge from "./VerdictBadge";
import ScoreBar from "./ScoreBar";
import SignalChip from "./SignalChip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, RotateCcw, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { AnalysisResult, UrlCheckResult, normaliseVerdict, riskToVerdict } from "@/lib/api";
import { toast } from "sonner";

interface ResultCardProps {
  data: AnalysisResult | UrlCheckResult;
  className?: string;
}

const ResultCard = ({ data, className }: ResultCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Check if it's a URL check result or a standard analysis result
  const isUrlCheck = "url" in data;
  
  const verdict = isUrlCheck 
    ? riskToVerdict((data as UrlCheckResult).risk_level)
    : normaliseVerdict((data as AnalysisResult).verdict);

  const confidence = data.confidence;
  const signals = data.signals;
  const explanation = data.explanation;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("Copied to clipboard", {
      description: "Full analysis report has been copied."
    });
  };

  return (
    <div className={cn("rounded-2xl bg-card shadow-card border border-border overflow-hidden animate-slide-up", className)}>
      {/* Header */}
      <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center gap-4 border-b border-border">
        <div className="flex-1 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Analysis Result</p>
          <h3 className="text-xl font-bold text-foreground">
            {isUrlCheck ? "URL Credibility" : "Content Verification"}
          </h3>
          {isUrlCheck && (
            <p className="text-xs text-muted-foreground truncate max-w-md">{(data as UrlCheckResult).url}</p>
          )}
        </div>
        <VerdictBadge verdict={verdict} size="lg" />
      </div>

      {/* Confidence */}
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Overall Confidence</span>
          <span className="text-2xl font-bold text-foreground">{confidence}%</span>
        </div>

        {/* Score Breakdown (only for standard analysis) */}
        {!isUrlCheck && (
          <div className="space-y-3">
            <ScoreBar label="AI Generated" value={(data as AnalysisResult).scores.ai_generated} color="suspicious" />
            <ScoreBar label="Deepfake" value={(data as AnalysisResult).scores.deepfake} color="verified" />
            <ScoreBar label="Manipulation" value={(data as AnalysisResult).scores.manipulation} color="suspicious" />
            <ScoreBar label="Context Match" value={(data as AnalysisResult).scores.context_match} color="verified" />
          </div>
        )}

        {/* Signals */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Detected Signals</p>
          <div className="flex flex-wrap gap-2">
            {signals.map((signal, idx) => (
              <SignalChip 
                key={idx} 
                label={signal} 
                type={verdict === "verified" ? "success" : verdict === "manipulated" ? "danger" : "warning"} 
              />
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="rounded-xl bg-surface-elevated p-4 space-y-1.5">
          <p className="text-sm font-semibold text-foreground">What this means</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {explanation}
          </p>
        </div>

        {/* Technical Details Accordion */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showDetails ? "Hide" : "Show"} technical details
        </button>

        {showDetails && (
          <div className="rounded-xl bg-surface-elevated p-4 space-y-3 animate-slide-up">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {!isUrlCheck && (
                <div>
                  <p className="text-muted-foreground">Content Type</p>
                  <p className="font-medium text-foreground uppercase">{(data as AnalysisResult).content_type}</p>
                </div>
              )}
              {isUrlCheck && (
                <div>
                  <p className="text-muted-foreground">Risk Level</p>
                  <p className="font-medium text-foreground uppercase">{(data as UrlCheckResult).risk_level}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Confidence Score</p>
                <p className="font-medium text-foreground">{confidence / 100}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4" /> Copy JSON
          </Button>
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4" /> View full report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
