import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ExtensionPopup from "@/components/ExtensionPopup";
import UrlRiskBanner from "@/components/UrlRiskBanner";
import SelectionBubble from "@/components/SelectionBubble";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Chrome, BellRing, Download, Puzzle, SearchCheck } from "lucide-react";

const installSteps = [
  {
    title: "Request early access",
    description: "Join the launch list while the Chrome Web Store package is being finalized.",
    icon: BellRing,
  },
  {
    title: "Install from Chrome Web Store",
    description: "Once published, users install Verifai Lens directly in Chrome with one click.",
    icon: Download,
  },
  {
    title: "Pin and start verifying",
    description: "Pin the extension, scan the page, and open the dashboard for deeper analysis.",
    icon: Puzzle,
  },
];

const Extension = () => {
  const handleStoreClick = () => {
    toast.info("Chrome Web Store listing coming soon", {
      description: "The install flow is staged. We can plug in the real store URL as soon as you have it.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display text-foreground">Verifai Lens - Extension Preview</h1>
          <p className="text-sm text-muted-foreground">Preview the browser extension experience and show users exactly how they will get it.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Chrome className="h-3.5 w-3.5" />
                Browser Extension
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Install Verifai Lens in Chrome</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Add the extension to verify pages as you browse, inspect selected text instantly, and jump into the full dashboard when you need deeper analysis.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted-foreground">
                <SearchCheck className="h-3.5 w-3.5 text-primary" />
                Chrome Web Store listing in progress
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="accent" size="lg" onClick={handleStoreClick}>
                <Chrome className="h-4 w-4" />
                Chrome Web Store
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {installSteps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </section>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Extension Popup</p>
            <ExtensionPopup />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Text Selection Action</p>
            <SelectionBubble />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL Credibility Banners</p>
          <div className="space-y-3 max-w-2xl">
            <UrlRiskBanner risk="low" domain="reuters.com" />
            <UrlRiskBanner risk="medium" domain="unknown-news.net" />
            <UrlRiskBanner risk="high" domain="fake-headlines.biz" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Extension;
