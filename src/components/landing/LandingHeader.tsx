import React, { useState } from 'react';
import { ChevronDown, Menu, X, ArrowRight, Sparkles, MessageSquare, PhoneCall, ShieldCheck, HeartPulse, Globe2, Download } from 'lucide-react';

interface LandingHeaderProps {
  onOpenAuth: () => void;
  isAuthenticated: boolean;
  onNavigateWorkspace: () => void;
  onScrollToSection?: (sectionId: string) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onOpenAuth,
  isAuthenticated,
  onNavigateWorkspace,
  onScrollToSection,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleNavClick = (sectionId: string) => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    if (onScrollToSection) {
      onScrollToSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#F8F8F5]/90 backdrop-blur-md border-b border-[#DDE3DF]/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <a href="/" className="flex flex-col group cursor-pointer select-none">
          <img 
            src="/images/chatr-official-logo.png" 
            alt="CHATR" 
            className="h-7 sm:h-8 w-auto object-contain"
          />
          <span className="text-[9px] font-bold tracking-[0.28em] uppercase text-[#53605C] mt-0.5">
            SUPER APP
          </span>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#53605C]">
          
          {/* Features Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setActiveDropdown('features')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button 
              onClick={() => handleNavClick('features')}
              className="flex items-center gap-1 text-[#111817] hover:text-[#164E3F] transition-colors py-2 cursor-pointer"
            >
              <span>Features</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {activeDropdown === 'features' && (
              <div className="absolute top-full left-0 w-72 bg-white rounded-2xl shadow-xl border border-[#DDE3DF] p-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                <button 
                  onClick={() => handleNavClick('features')}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F8F5] flex items-start gap-3 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-[#164E3F] mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-[#111817]">Direct Chat</div>
                    <div className="text-[11px] text-[#53605C]">Message without saving numbers</div>
                  </div>
                </button>
                <button 
                  onClick={() => handleNavClick('features')}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F8F5] flex items-start gap-3 transition-colors cursor-pointer"
                >
                  <Globe2 className="w-4 h-4 text-[#164E3F] mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-[#111817]">Live Call Translation</div>
                    <div className="text-[11px] text-[#53605C]">Talk across 40+ languages live</div>
                  </div>
                </button>
                <button 
                  onClick={() => handleNavClick('features')}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F8F5] flex items-start gap-3 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#164E3F] mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-[#111817]">Spam Call Shield</div>
                    <div className="text-[11px] text-[#53605C]">AI screens unknown callers</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Personal SI Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setActiveDropdown('si')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button 
              onClick={() => handleNavClick('features')}
              className="flex items-center gap-1 text-[#53605C] hover:text-[#111817] transition-colors py-2 cursor-pointer"
            >
              <span>Personal SI</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {activeDropdown === 'si' && (
              <div className="absolute top-full left-0 w-72 bg-white rounded-2xl shadow-xl border border-[#DDE3DF] p-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                <button 
                  onClick={() => handleNavClick('features')}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F8F5] flex items-start gap-3 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#164E3F] mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-[#111817]">AI Call Answering</div>
                    <div className="text-[11px] text-[#53605C]">Answers & summarizes while you're busy</div>
                  </div>
                </button>
                <button 
                  onClick={() => handleNavClick('features')}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F8F5] flex items-start gap-3 transition-colors cursor-pointer"
                >
                  <HeartPulse className="w-4 h-4 text-[#164E3F] mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-[#111817]">Health Hub & AI Doctor</div>
                    <div className="text-[11px] text-[#53605C]">Symptom checker, vitals & medicine</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <a 
            href="/direct-chat" 
            className="text-[#53605C] hover:text-[#111817] transition-colors"
          >
            Direct Chat
          </a>

          <a 
            href="/lookup" 
            className="text-[#53605C] hover:text-[#111817] transition-colors"
          >
            Caller Lookup
          </a>

          <a 
            href="/download" 
            className="flex items-center gap-1.5 text-[#53605C] hover:text-[#111817] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>App</span>
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-4">
          {isAuthenticated ? (
            <button
              onClick={onNavigateWorkspace}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#164E3F] hover:bg-[#2E6B59] text-white text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <span>Open CHATR</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={onOpenAuth}
                className="text-sm font-semibold text-[#111817] hover:text-[#164E3F] transition-colors px-3 py-2 cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#164E3F] hover:bg-[#2E6B59] text-white text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenAuth}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#164E3F] text-white"
          >
            Get Started
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#111817] hover:text-[#164E3F] rounded-lg"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#DDE3DF] bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <button 
            onClick={() => handleNavClick('features')}
            className="block w-full text-left py-2 text-sm font-medium text-[#111817]"
          >
            Features & Capabilities
          </button>
          <a 
            href="/direct-chat"
            className="block w-full text-left py-2 text-sm font-medium text-[#111817]"
          >
            Direct Chat Without Saving Number
          </a>
          <a 
            href="/lookup"
            className="block w-full text-left py-2 text-sm font-medium text-[#111817]"
          >
            Caller Lookup & Spam ID
          </a>
          <a 
            href="/download"
            className="block w-full text-left py-2 text-sm font-medium text-[#111817]"
          >
            Download Mobile App
          </a>
          <div className="pt-3 border-t border-[#DDE3DF]">
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}
              className="w-full text-center py-3 rounded-full bg-[#164E3F] text-white font-semibold text-sm"
            >
              Sign In / Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
