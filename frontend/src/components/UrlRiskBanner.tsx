import { Shield, AlertTriangle, XOctagon, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type RiskLevel = "low" | "medium" | "high";

interface UrlRiskBannerProps {
  risk: RiskLevel;
  domain?: string;
  className?: string;
}

const config: Record<RiskLevel, { icon: React.ElementType; label: string; sublabel: string; bg: string; text: string; border: string }> = {
  low: {
    icon: Shield,
    label: "Verified source",
    sublabel: "Risk: Low",
    bg: "bg-verified/10",
    text: "text-verified",
    border: "border-verified/20",
  },
  medium: {
    icon: AlertTriangle,
    label: "Unverified source",
    sublabel: "Risk: Medium",
    bg: "bg-suspicious/10",
    text: "text-suspicious",
    border: "border-suspicious/20",
  },
  high: {
    icon: XOctagon,
    label: "Suspicious domain",
    sublabel: "Risk: High",
    bg: "bg-manipulated/10",
    text: "text-manipulated",
    border: "border-manipulated/20",
  },
};

const UrlRiskBanner = ({ risk, domain = "example.com", className }: UrlRiskBannerProps) => {
  const [visible, setVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const { icon: Icon, label, sublabel, bg, text, border } = config[risk];

  if (!visible) return null;

  return (
    <div className={cn("border rounded-xl overflow-hidden", bg, border, className)}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Icon className={cn("h-4 w-4 shrink-0", text)} />
        <div className="flex-1 flex items-center gap-2 text-sm">
          <span className={cn("font-medium", text)}>{label}</span>
          <span className="text-muted-foreground">.</span>
          <span className="text-muted-foreground">{sublabel}</span>
          <span className="text-muted-foreground hidden sm:inline">. {domain}</span>
        </div>
        <button onClick={() => setShowDetails(!showDetails)} className={cn("text-xs font-medium flex items-center gap-1", text)}>
          Details <ChevronDown className={cn("h-3 w-3 transition-transform", showDetails && "rotate-180")} />
        </button>
        <button onClick={() => setVisible(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      {showDetails && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2.5 animate-slide-up">
          <div><span className="text-muted-foreground">Domain Age: </span><span className="font-medium text-foreground">2 years</span></div>
          <div><span className="text-muted-foreground">Reputation: </span><span className={cn("font-medium", text)}>{risk === "low" ? "Good" : risk === "medium" ? "Unknown" : "Poor"}</span></div>
          <div><span className="text-muted-foreground">Known Flags: </span><span className="font-medium text-foreground">{risk === "high" ? "Misinformation" : "None"}</span></div>
          <div><span className="text-muted-foreground">SSL: </span><span className="font-medium text-foreground">Valid</span></div>
        </div>
      )}
    </div>
  );
};

export default UrlRiskBanner;
