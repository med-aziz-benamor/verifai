import { Upload, FileImage, FileText, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface UploadCardProps {
  onAnalyze?: () => void;
  className?: string;
}

type TabKey = "media" | "text" | "url";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "media", label: "Image / Video", icon: <FileImage className="h-4 w-4" /> },
  { key: "text", label: "Text / PDF", icon: <FileText className="h-4 w-4" /> },
  { key: "url", label: "URL", icon: <Link className="h-4 w-4" /> },
];

const UploadCard = ({ onAnalyze, className }: UploadCardProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("media");
  const [hasContent, setHasContent] = useState(false);

  return (
    <div className={cn("rounded-2xl bg-card shadow-card border border-border p-6 space-y-5", className)}>
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setHasContent(false); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload area */}
      {activeTab === "media" && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface-elevated p-10 cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => setHasContent(true)}
        >
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, MP4, WebM · Max 50MB</p>
          </div>
        </div>
      )}

      {activeTab === "text" && (
        <textarea
          placeholder="Paste text content here, or drop a PDF file..."
          className="w-full rounded-xl border border-border bg-surface-elevated p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none h-36 focus:outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setHasContent(e.target.value.length > 0)}
        />
      )}

      {activeTab === "url" && (
        <input
          type="url"
          placeholder="https://example.com/article"
          className="w-full rounded-xl border border-border bg-surface-elevated p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setHasContent(e.target.value.length > 0)}
        />
      )}

      <Button
        variant="accent"
        size="lg"
        className="w-full"
        onClick={onAnalyze}
        disabled={!hasContent}
      >
        Analyze Content
      </Button>
    </div>
  );
};

export default UploadCard;
