import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  title?: string;
  subtitle?: string;
  steps?: string[];
  className?: string;
}

const LoadingState = ({
  title = "Working on it",
  subtitle = "Please wait a moment.",
  steps = [],
  className,
}: LoadingStateProps) => (
  <div className={cn("rounded-2xl bg-card shadow-card border border-border p-8 space-y-6", className)}>
    <div className="text-center space-y-2">
      <Loader2 className="h-8 w-8 text-primary mx-auto animate-spin" />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>

    {steps.length > 0 && (
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step} className="flex items-center gap-3 rounded-lg bg-primary/5 px-4 py-3">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <span className="text-sm font-medium text-foreground">{step}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default LoadingState;
