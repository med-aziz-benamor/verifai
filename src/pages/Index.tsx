import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Shield, Eye, Globe, Zap, FileSearch,
  GraduationCap, Newspaper, Users, Building,
  ArrowRight, CheckCircle, Chrome
} from "lucide-react";

const features = [
  { icon: Shield, title: "Content Authenticity", desc: "Detect AI-generated images, deepfakes, and manipulated media using advanced pattern analysis." },
  { icon: Eye, title: "Contextual Consistency", desc: "Verify if content matches its claimed context, spotting misleading framing and misattribution." },
  { icon: Globe, title: "Source Credibility", desc: "Assess domain reputation, source reliability, and publishing history in real time." },
];

const useCases = [
  { icon: GraduationCap, title: "Students", desc: "Verify sources for research papers and detect AI-generated content in references." },
  { icon: Newspaper, title: "Journalists", desc: "Fact-check images, videos, and claims before publishing stories." },
  { icon: Users, title: "Everyday Users", desc: "Check suspicious content before sharing on social media." },
  { icon: Building, title: "Teams & Institutions", desc: "Integrate verification workflows into your organization's content pipeline." },
];

const Index = () => (
  <div className="min-h-screen bg-background">
    <Header />

    <section className="gradient-hero">
      <div className="container py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Zap className="h-3.5 w-3.5" />
            AI-Powered Trust Verification
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold font-display text-foreground leading-tight tracking-tight">
            See through the noise
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Verify images, videos, text, PDFs, and webpages in seconds. Verifai helps you understand what&apos;s real, what&apos;s manipulated, and why it matters.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="hero" size="xl" asChild>
              <Link to="/dashboard"><FileSearch className="h-5 w-5" /> Analyze Content</Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/extension"><Chrome className="h-5 w-5" /> Get Extension</Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-sm text-muted-foreground">
            {["Images and video", "Text and PDFs", "URLs and webpages"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-border bg-card/70 px-4 py-2 backdrop-blur-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section id="features" className="py-20 bg-background">
      <div className="container">
        <div className="text-center space-y-3 mb-14">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground">What Verifai Checks</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Three layers of verification to ensure you can trust digital content.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-card shadow-card border border-border p-8 space-y-4 hover:shadow-soft transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="py-20 bg-background">
      <div className="container">
        <div className="text-center space-y-3 mb-14">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground">Built for Everyone</h2>
          <p className="text-muted-foreground max-w-md mx-auto">From students to newsrooms, Verifai adapts to your verification needs.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((uc) => (
            <div key={uc.title} className="rounded-2xl bg-card shadow-card border border-border p-6 space-y-3 text-center hover:shadow-soft transition-shadow">
              <div className="h-11 w-11 mx-auto rounded-xl bg-accent/10 flex items-center justify-center">
                <uc.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-base font-bold text-foreground">{uc.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section id="extension" className="py-20 bg-surface-elevated">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Chrome className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground">Verifai Lens</h2>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            Verify content as you browse. Our Chrome extension checks page credibility, lets you select any text for instant verification, and shows trust signals in real time.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
            {["Real-time page scanning", "Text selection verification", "Domain credibility alerts", "One-click full analysis"].map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-verified" /> {f}
              </span>
            ))}
          </div>
          <Button variant="hero" size="xl" asChild>
            <Link to="/extension">
              <Chrome className="h-5 w-5" /> Get Extension <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Index;
