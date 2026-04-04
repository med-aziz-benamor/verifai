import { Upload, FileImage, FileText, Link, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";

interface UploadCardProps {
  onAnalyze?: (input: File | string, mode: "media" | "text" | "url") => void;
  className?: string;
}

type TabKey = "media" | "text" | "url";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "media", label: "Image / Video", icon: <FileImage className="h-4 w-4" /> },
  { key: "text",  label: "Text / PDF",    icon: <FileText  className="h-4 w-4" /> },
  { key: "url",   label: "URL",           icon: <Link      className="h-4 w-4" /> },
];

const UploadCard = ({ onAnalyze, className }: UploadCardProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("media");
  const [file,    setFile]    = useState<File | null>(null);
  const [text,    setText]    = useState("");
  const [url,     setUrl]     = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasContent =
    (activeTab === "media" && file !== null) ||
    (activeTab === "text"  && text.trim().length > 0) ||
    (activeTab === "url"   && url.trim().length > 0);

  const switchTab = (key: TabKey) => {
    setActiveTab(key);
    setFile(null);
    setText("");
    setUrl("");
  };

  const handleFile = (f: File) => setFile(f);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, []);

  const handleSubmit = () => {
    if (!hasContent) return;
    if (activeTab === "media" && file)       onAnalyze?.(file, "media");
    else if (activeTab === "text" && text)   onAnalyze?.(text.trim(), "text");
    else if (activeTab === "url"  && url)    onAnalyze?.(url.trim(), "url");
  };

  return (
    <div className={cn("rounded-2xl bg-card shadow-card border border-border p-6 space-y-5", className)}>
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
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

      {/* Media upload */}
      {activeTab === "media" && (
        !file ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border bg-surface-elevated hover:border-primary/40"
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className="rounded-full bg-primary/10 p-3">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Drop files here or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, MP4, WebM, PDF · Max 50 MB</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileImage className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
            <button onClick={() => setFile(null)} className="ml-2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      )}

      {/* Text input */}
      {activeTab === "text" && (
        <textarea
          placeholder="Paste text content here, or drop a PDF file..."
          className="w-full rounded-xl border border-border bg-surface-elevated p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none h-36 focus:outline-none focus:ring-2 focus:ring-ring"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {/* URL input */}
      {activeTab === "url" && (
        <input
          type="url"
          placeholder="https://example.com/article"
          className="w-full rounded-xl border border-border bg-surface-elevated p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      )}

      <Button
        variant="accent"
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={!hasContent}
      >
        Analyze Content
      </Button>
    </div>
  );
};

export default UploadCard;
