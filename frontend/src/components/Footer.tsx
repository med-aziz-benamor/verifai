import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";

const Footer = () => (
  <footer className="border-t border-border bg-card py-12">
    <div className="container">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <Link to="/" className="flex items-center gap-2" aria-label="Verifai home">
            <BrandLogo imageClassName="h-12" />
          </Link>
          <p className="text-sm text-muted-foreground">See through the noise. AI-powered trust verification for everyone.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Product</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="hover:text-foreground cursor-pointer transition-colors">Dashboard</p>
            <p className="hover:text-foreground cursor-pointer transition-colors">Browser Extension</p>
            <p className="hover:text-foreground cursor-pointer transition-colors">API</p>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Resources</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="hover:text-foreground cursor-pointer transition-colors">Documentation</p>
            <p className="hover:text-foreground cursor-pointer transition-colors">Blog</p>
            <p className="hover:text-foreground cursor-pointer transition-colors">Support</p>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Legal</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</p>
            <p className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</p>
          </div>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        Copyright {new Date().getFullYear()} Verifai. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
