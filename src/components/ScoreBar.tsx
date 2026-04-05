import { cn } from "@/lib/utils";

interface ScoreBarProps {
  label: string;
  value: number; // 0–100
  color?: "primary" | "verified" | "suspicious" | "manipulated";
  className?: string;
}

const colorMap = {
  primary: "bg-primary",
  verified: "bg-verified",
  suspicious: "bg-suspicious",
  manipulated: "bg-manipulated",
};

const ScoreBar = ({ label, value, color = "primary", className }: ScoreBarProps) => (
  <div className={cn("space-y-1.5", className)}>
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}%</span>
    </div>
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", colorMap[color])}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

export default ScoreBar;
