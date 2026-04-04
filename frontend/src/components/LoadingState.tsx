import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface LoadingStateProps {
  onComplete?: () => void;
  className?: string;
}

const steps = [
  { label: "Checking authenticity", icon: CheckCircle },
  { label: "Evaluating manipulation signals", icon: AlertTriangle },
  { label: "Verifying context", icon: CheckCircle },
  { label: "Inspecting source cues", icon: CheckCircle },
];

const LoadingState = ({ onComplete, className }: LoadingStateProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(() => onComplete?.(), 600);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={cn("rounded-2xl bg-card shadow-card border border-border p-8 space-y-6", className)}>
      <div className="text-center space-y-2">
        <Loader2 className="h-8 w-8 text-primary mx-auto animate-spin" />
        <h3 className="text-lg font-semibold text-foreground">Analyzing content</h3>
        <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;

          return (
            <div
              key={step.label}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-300",
                isDone && "bg-verified/5",
                isActive && "bg-primary/5",
                !isDone && !isActive && "opacity-40"
              )}
            >
              {isDone ? (
                <CheckCircle className="h-5 w-5 text-verified" />
              ) : isActive ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted" />
              )}
              <span className={cn("text-sm", (isDone || isActive) ? "font-medium text-foreground" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoadingState;
