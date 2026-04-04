import { cn } from "@/lib/utils";

interface SignalChipProps {
  label: string;
  type?: "info" | "warning" | "danger" | "success";
  className?: string;
}

const typeStyles = {
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-suspicious/10 text-suspicious border-suspicious/20",
  danger: "bg-manipulated/10 text-manipulated border-manipulated/20",
  success: "bg-verified/10 text-verified border-verified/20",
};

const SignalChip = ({ label, type = "info", className }: SignalChipProps) => (
  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", typeStyles[type], className)}>
    {label}
  </span>
);

export default SignalChip;
