import VerdictBadge from "./VerdictBadge";
import ScoreBar from "./ScoreBar";
import { Button } from "@/components/ui/button";
import BrandLogo from "./BrandLogo";
import { ExternalLink, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";

const ExtensionPopup = () => (
  <div className="w-[360px] rounded-2xl bg-card shadow-card border border-border overflow-hidden">
    <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3">
      <div className="space-y-1">
        <BrandLogo imageClassName="h-8" />
        <p className="text-[10px] text-muted-foreground">Verifai Lens</p>
      </div>
      <p className="pt-1 text-[10px] text-muted-foreground">See through the noise</p>
    </div>

    <div className="px-4 py-3 space-y-3">
      <div className="rounded-lg bg-surface-elevated p-3">
        <p className="text-xs text-muted-foreground mb-1">Selected content</p>
        <p className="text-sm text-foreground line-clamp-2">
          "Scientists confirm breakthrough in quantum computing that could change everything..."
        </p>
      </div>

      <div className="flex items-center justify-between">
        <VerdictBadge verdict="suspicious" size="sm" />
        <span className="text-lg font-bold text-foreground">72%</span>
      </div>

      <div className="space-y-2">
        <ScoreBar label="AI Generated" value={68} color="suspicious" />
        <ScoreBar label="Context Match" value={85} color="verified" />
      </div>

      <div className="rounded-lg bg-surface-elevated p-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          This claim contains language patterns consistent with AI-generated text. Source credibility is moderate. We recommend cross-checking.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="default" size="sm" className="flex-1 text-xs" asChild>
          <Link to="/dashboard">
            <ExternalLink className="h-3 w-3" /> Full Report
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
          <Link to="/dashboard">
            <LayoutDashboard className="h-3 w-3" /> Dashboard
          </Link>
        </Button>
      </div>
    </div>
  </div>
);

export default ExtensionPopup;
