import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UploadCard from "@/components/UploadCard";
import LoadingState from "@/components/LoadingState";
import ResultCard from "@/components/ResultCard";
import { useState } from "react";
import { analyzeContent, checkUrl, AnalysisResult, UrlCheckResult } from "@/lib/api";
import { toast } from "sonner";

type DashboardState = "upload" | "loading" | "result";

const Dashboard = () => {
  const [state, setState] = useState<DashboardState>("upload");
  const [result, setResult] = useState<AnalysisResult | UrlCheckResult | null>(null);

  const handleAnalyze = async (input: File | string, mode: "media" | "text" | "url") => {
    setState("loading");
    setResult(null);

    try {
      let response;
      if (mode === "url") {
        response = await checkUrl(input as string);
      } else {
        response = await analyzeContent(input);
      }
      setResult(response);
      setState("result");
    } catch (error: any) {
      toast.error("Analysis Failed", {
        description: error.message || "An unexpected error occurred during analysis.",
      });
      setState("upload");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display text-foreground">Verification Dashboard</h1>
          <p className="text-sm text-muted-foreground">Upload content or paste a URL to start analysis</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div>
            {state === "upload" && (
              <UploadCard onAnalyze={handleAnalyze} />
            )}
            {state === "loading" && (
              <LoadingState onComplete={() => {}} /> 
              /* onComplete logic moved to the async/await in handleAnalyze */
            )}
            {state === "result" && result && (
              <div className="space-y-4">
                <ResultCard data={result} />
                <button
                  onClick={() => setState("upload")}
                  className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                >
                  <span>←</span> Analyze another
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
