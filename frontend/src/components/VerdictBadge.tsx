import { cn } from "@/lib/utils";

type Verdict = "verified" | "suspicious" | "manipulated";

const config: Record<Verdict, { label: string; className: string }> = {
  verified: { label: "VERIFIED", className: "bg-verified text-verified-foreground" },
  suspicious: { label: "SUSPICIOUS", className: "bg-suspicious text-suspicious-foreground" },
  manipulated: { label: "MANIPULATED", className: "bg-manipulated text-manipulated-foreground" },
};

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const VerdictBadge = ({ verdict, size = "md", className }: VerdictBadgeProps) => {
  const { label, className: badgeClass } = config[verdict];
  const sizeClass = {
    sm: "text-xs px-2.5 py-0.5",
    md: "text-sm px-3.5 py-1.5 font-semibold",
    lg: "text-base px-5 py-2 font-bold",
  }[size];

  return (
    <span className={cn("inline-flex items-center rounded-full tracking-wide", badgeClass, sizeClass, className)}>
      <span className="mr-1.5 h-2 w-2 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};

export default VerdictBadge;
