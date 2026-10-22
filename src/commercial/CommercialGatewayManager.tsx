import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sparkles, X, ChevronRight, Globe2, ArrowRight } from 'lucide-react';
import { FirstLaunchCommercial } from './FirstLaunchCommercial';
import { CommercialHubModal } from './CommercialHubModal';
import { COMMERCIAL_CAMPAIGNS, isCommercialGatewayEnabled } from './campaignRegistry';

export const CommercialGatewayManager: React.FC = () => {
  const [hubOpen, setHubOpen] = useState(false);
  const [barDismissed, setBarDismissed] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const location = useLocation();

  // Rotate through the 7 brands every 4 seconds in the top bar
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % COMMERCIAL_CAMPAIGNS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  if (!isCommercialGatewayEnabled()) {
    return null;
  }

  // Critical workflow protection: NEVER show commercial triggers in active calls, chat conversations, or auth
  const isCriticalWorkflow =
    location.pathname.startsWith('/chat') ||
    location.pathname.startsWith('/calls') ||
    location.pathname.startsWith('/call/') ||
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/qr-login') ||
    location.pathname.startsWith('/admin') ||
    location.pathname === '/gateway' ||
    location.pathname === '/commercial';

  if (isCriticalWorkflow) {
    return null;
  }

  const currentBrand = COMMERCIAL_CAMPAIGNS[tickerIndex];

  return (
    <>
      {/* 1. First-launch commercial sequence (anchored to top) */}
      <FirstLaunchCommercial onOpenGatewayHub={() => setHubOpen(true)} />

      {/* 2. TOP COMMERCIAL GATEWAY BAR (Positioned at the very top of the page) */}
      {!barDismissed ? (
        <aside
          aria-label="Commercial Gateway Ecosystem Bar"
          className="w-full bg-slate-950 text-white border-b border-slate-800/90 z-50 text-xs py-2 px-4 shadow-md transition-all duration-300"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Left: Brand badge & active rotating commercial ticker */}
            <div className="flex items-center gap-2.5 overflow-hidden">
              <button
                type="button"
                onClick={() => setHubOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0 hover:bg-blue-500/30 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Commercial Gateway
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-500/30 text-[10px] font-mono">
                  7
                </span>
              </button>

              <div className="hidden sm:flex items-center gap-2 truncate text-slate-300">
                <span className="text-slate-400 font-mono text-[11px] shrink-0">
                  [{tickerIndex + 1}/7]
                </span>
                <span className="font-semibold text-white truncate">
                  {currentBrand.brandName}:
                </span>
                <span className="text-slate-300 truncate">
                  {currentBrand.headline}
                </span>
              </div>
            </div>

            {/* Right: Actions & Dismiss */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setHubOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs"
              >
                <span>Explore All (7)</span>
                <ChevronRight className="w-3 h-3" />
              </button>

              <Link
                to="/gateway"
                className="hidden md:inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white underline font-medium px-2 py-1"
              >
                Showcase
              </Link>

              <button
                type="button"
                onClick={() => setBarDismissed(true)}
                aria-label="Minimize commercial gateway bar"
                title="Minimize bar"
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      ) : (
        /* 3. Minimized Top Trigger (stays at TOP of page, e.g. top-3 left-4) */
        <div className="fixed top-3 left-4 z-50">
          <button
            type="button"
            onClick={() => setHubOpen(true)}
            title="Explore CHATR Commercial Gateway (7 Destinations)"
            aria-label="Explore CHATR Commercial Gateway"
            className="group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-950/90 text-white border border-slate-800 shadow-lg hover:border-blue-400 backdrop-blur-md transition-all duration-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Commercial Gateway</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-600/30 text-blue-300 text-[10px] font-mono">
              7
            </span>
          </button>
        </div>
      )}

      {/* 4. Persistent Commercial Hub Modal */}
      <CommercialHubModal isOpen={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
};
