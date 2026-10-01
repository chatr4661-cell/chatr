import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Search, 
  Download, 
  Smartphone, 
  LogIn, 
  ArrowRight, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';

export const PublicHeader: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setIsLoggedIn(Boolean(data.session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) setIsLoggedIn(Boolean(session));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <img 
            src={chatrIconLogo} 
            alt="Chatr" 
            className="w-9 h-9 rounded-xl shadow-sm transition-transform group-hover:scale-105" 
          />
          <span className="font-bold text-lg tracking-tight text-foreground flex items-center">
            Chatr<span className="text-primary font-black ml-0.5">+</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link 
            to="/direct-chat" 
            className="hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            Direct Chat
          </Link>
          <Link 
            to="/lookup" 
            className="hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Search className="w-4 h-4 text-blue-500" />
            Caller Lookup
          </Link>
          <Link 
            to="/download" 
            className="hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-primary" />
            App Download
          </Link>
          <Link 
            to="/about" 
            className="hover:text-foreground transition-colors"
          >
            About
          </Link>
        </nav>

        {/* Right CTA / Login Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          {isLoggedIn ? (
            <Button 
              size="sm" 
              onClick={() => navigate('/chat')}
              className="gap-2 font-semibold shadow-sm bg-primary hover:bg-primary/90"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Open Chatr
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  sessionStorage.setItem('auth_redirect', window.location.pathname);
                  navigate('/auth');
                }}
                className="text-xs font-semibold hover:text-primary gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Log In
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  sessionStorage.setItem('auth_redirect', window.location.pathname);
                  navigate('/auth');
                }}
                className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Sign In with Phone
              </Button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          {isLoggedIn ? (
            <Button 
              size="sm" 
              onClick={() => navigate('/chat')}
              className="h-8 px-2.5 text-xs font-semibold bg-primary"
            >
              Open
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={() => navigate('/auth')}
              className="h-8 px-3 text-xs font-semibold bg-emerald-600 text-white"
            >
              Log In
            </Button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background p-4 space-y-3 animate-in slide-in-from-top-2">
          <nav className="flex flex-col space-y-2 text-sm font-medium">
            <Link 
              to="/direct-chat" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-foreground"
            >
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              Direct Chat Without Saving Number
            </Link>
            <Link 
              to="/lookup" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-foreground"
            >
              <Search className="w-4 h-4 text-blue-500" />
              Caller ID & Spam Lookup
            </Link>
            <Link 
              to="/download" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-foreground"
            >
              <Download className="w-4 h-4 text-primary" />
              Download Android App
            </Link>
            <Link 
              to="/about" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-foreground"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              About Chatr
            </Link>
          </nav>

          <div className="pt-2 border-t border-border flex flex-col gap-2">
            {isLoggedIn ? (
              <Button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/chat');
                }}
                className="w-full font-semibold"
              >
                Go to Conversations
              </Button>
            ) : (
              <Button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  sessionStorage.setItem('auth_redirect', window.location.pathname);
                  navigate('/auth');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Sign In with Phone Number
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
