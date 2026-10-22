import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sparkles, X, ChevronRight, ChevronDown, ChevronUp, Globe2, ExternalLink, ShieldCheck, Play, Pause } from 'lucide-react';
import { FirstLaunchCommercial } from './FirstLaunchCommercial';
import { CommercialHubModal } from './CommercialHubModal';
import { COMMERCIAL_CAMPAIGNS, getAttributedUrl, isCommercialGatewayEnabled } from './campaignRegistry';
import { recordCommercialImpression, recordCommercialClick } from './commercialAnalytics';

export const CommercialGatewayManager: React.FC = () => {
  const [hubOpen, setHubOpen] = useState(false);
  const [barDismissed, setBarDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Expanded by default so visual commercial is immediately visible
  const [isPaused, setIsPaused] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const location = useLocation();

  // Rotate through the 7 brands every 5 seconds in the top commercial banner
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % COMMERCIAL_CAMPAIGNS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Record impression for active brand
  useEffect(() => {
    const current = COMMERCIAL_CAMPAIGNS[tickerIndex];
    if (current && !barDismissed) {
      recordCommercialImpression(current.id, true, 2000);
    }
  }, [tickerIndex, barDismissed]);

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
      {/* 1. First-launch commercial sequence */}
      <FirstLaunchCommercial onOpenGatewayHub={() => setHubOpen(true)} />

      {/* 2. TOP COMMERCIAL ADVERTISEMENT BILLBOARD (Positioned at the very top of the page) */}
      {!barDismissed ? (
        <aside
          aria-label="Commercial Gateway Ecosystem Advertisement"
          className="w-full bg-slate-950 text-white border-b border-slate-800 z-50 text-xs shadow-xl transition-all duration-300"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Top Ticker Bar */}
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                <Sparkles className="w-3 h-3" />
                Commercial Gateway
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-500/30 text-[10px] font-mono">
                  7
                </span>
              </span>

              <span className="text-slate-400 font-mono text-[11px] shrink-0">
                [{tickerIndex + 1}/7]
              </span>

              <span className="font-semibold text-white truncate hidden sm:inline">
                {currentBrand.brandName}:
              </span>
              <span className="text-slate-300 truncate hidden md:inline">
                {currentBrand.headline}
              </span>
            </div>

            {/* Controls & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
                title={isExpanded ? 'Collapse commercial' : 'Expand commercial'}
              >
                <span>{isExpanded ? 'Hide Details' : 'View Commercial'}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setHubOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs"
              >
                <span>Explore All (7)</span>
                <ChevronRight className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setBarDismissed(true)}
                aria-label="Dismiss top commercial"
                title="Dismiss commercial bar"
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Expanded Rich Visual Commercial Advertisement Card */}
          {isExpanded && (
            <div className="border-t border-slate-800/80 bg-slate-900/60 px-4 py-3.5 animate-in fade-in duration-200">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Visual Image Banner Left Side */}
                <div className="md:col-span-4 relative h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group shadow-md">
                  <img
                    src={currentBrand.imageUrl}
                    alt={currentBrand.brandName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${currentBrand.gradient} opacity-30`} />

                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-sm text-white border border-white/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                      {currentBrand.badgeText}
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-white drop-shadow-md">
                      {currentBrand.brandName}
                    </span>
                    <span className="text-[10px] font-mono text-white/80 bg-black/60 px-1.5 py-0.5 rounded">
                      {currentBrand.displayHostname}
                    </span>
                  </div>
                </div>

                {/* Details & Action Right Side */}
                <div className="md:col-span-8 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                        {currentBrand.categoryLabel}
                      </span>
                      <span className="text-slate-600 dark:text-slate-500">•</span>
                      <span className="text-[11px] text-slate-400">
                        Commercial Advertisement
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-tight">
                      {currentBrand.headline}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                      {currentBrand.valueProposition}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      {currentBrand.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Play / Pause toggle */}
                      <button
                        type="button"
                        onClick={() => setIsPaused(!isPaused)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                        title={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
                      >
                        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      </button>

                      {/* Outbound Link CTA */}
                      <a
                        href={getAttributedUrl(currentBrand, 'top_billboard')}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordCommercialClick(currentBrand.id, 'top_billboard')}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs"
                      >
                        <span>{currentBrand.ctaText}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </aside>
      ) : (
        /* Minimized Top Pill */
        <div className="fixed top-3 left-4 z-50">
          <button
            type="button"
            onClick={() => setBarDismissed(false)}
            title="Open CHATR Commercial Gateway"
            aria-label="Open Commercial Gateway"
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

      {/* 3. Persistent Commercial Hub Modal with React Portal */}
      <CommercialHubModal isOpen={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
};
