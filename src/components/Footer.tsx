import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="w-full border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-xs text-muted-foreground">
            Chatr is a brand of TalentXcel Services Pvt. Ltd.
          </p>
          <p className="text-xs text-muted-foreground">
            © 2025 All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1 text-xs">
            <Link 
              to="/terms" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Terms
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link 
              to="/privacy" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link 
              to="/refund" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Refund
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link 
              to="/disclaimer" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Disclaimer
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
