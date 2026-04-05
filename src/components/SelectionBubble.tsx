import { Shield } from "lucide-react";

const SelectionBubble = () => (
  <div className="inline-flex items-center gap-2 rounded-full bg-card shadow-soft border border-border px-3 py-2 cursor-pointer hover:shadow-md transition-shadow">
    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
      <Shield className="h-3 w-3 text-primary-foreground" />
    </div>
    <span className="text-xs font-medium text-foreground">Verify with Verifai</span>
  </div>
);

export default SelectionBubble;
