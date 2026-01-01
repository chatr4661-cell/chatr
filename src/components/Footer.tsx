import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="w-full mt-auto py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-[11px] text-muted-foreground/70">
            Chatr is a brand of TalentXcel Services Pvt. Ltd.
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            © 2026 All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
            <Link 
              to="/about" 
              className="text-muted-foreground/70 hover:text-primary transition-colors"
            >
              About
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link 
              to="/help" 
              className="text-muted-foreground/70 hover:text-primary transition-colors"
            >
              Help
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link 
              to="/contact" 
              className="text-muted-foreground/70 hover:text-primary transition-colors"
            >
              Contact
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link 
              to="/terms" 
              className="text-muted-foreground/70 hover:text-primary transition-colors"
            >
              Terms
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link 
              to="/privacy" 
              className="text-muted-foreground/70 hover:text-primary transition-colors"
            >
              Privacy
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link 
              to="/disclaimer" 
              className="text-muted-foreground/70 hover:text-primary transition-colors"
            >
              Disclaimer
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
