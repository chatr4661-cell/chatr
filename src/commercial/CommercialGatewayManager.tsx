import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Play,
  Pause,
  ArrowLeftRight
} from 'lucide-react';
import { FirstLaunchCommercial } from './FirstLaunchCommercial';
import { CommercialHubModal } from './CommercialHubModal';
import { COMMERCIAL_CAMPAIGNS, getAttributedUrl, isCommercialGatewayEnabled } from './campaignRegistry';
import { recordCommercialImpression, recordCommercialClick } from './commercialAnalytics';

export const CommercialGatewayManager: React.FC = () => {
  const [hubOpen, setHubOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  // Default to collapsed on mobile (<640px) so it never covers mobile screen
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return false;
    }
    return true;
  });
  const [isPaused, setIsPaused] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [dockSide, setDockSide] = useState<'right' | 'left'>(() => {
    try {
      const saved = localStorage.getItem('chatr_commercial_dock_side');
      return saved === 'left' ? 'left' : 'right';
    } catch {
      return 'right';
    }
  });

  const location = useLocation();

  // ONLY render at index page ('/' or '') as explicitly instructed
  const isIndexPage = location.pathname === '/' || location.pathname === '';

  // Save dock side preference (Right ↔ Left)
  const toggleDockSide = () => {
    const nextSide = dockSide === 'right' ? 'left' : 'right';
    setDockSide(nextSide);
    try {
      localStorage.setItem('chatr_commercial_dock_side', nextSide);
    } catch {
      // ignore storage error
    }
  };

  // Rotate through the 7 brands every 5 seconds when not paused
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
    if (current && !isDismissed && isIndexPage) {
      recordCommercialImpression(current.id, true, 2000);
    }
  }, [tickerIndex, isDismissed, isIndexPage]);

  // Check if feature flag enabled and strictly on index route
  if (!isCommercialGatewayEnabled() || !isIndexPage) {
    return null;
  }

  const currentBrand = COMMERCIAL_CAMPAIGNS[tickerIndex];

  return (
    <>
      {/* 1. First-launch commercial sequence (runs once strictly on index) */}
      <FirstLaunchCommercial onOpenGatewayHub={() => setHubOpen(true)} />

      {/* 2. FLOATING EXPANDABLE COMMERCIAL ADVERTISEMENT WIDGET */}
      {!isDismissed ? (
        isExpanded ? (
          /* EXPANDED FLOATING COMMERCIAL CARD - Compact on mobile, rich on desktop */
          <aside
            aria-label="Commercial Ecosystem Advertisement"
            className={`fixed top-16 sm:top-24 ${
              dockSide === 'right' ? 'right-2 sm:right-6' : 'left-2 sm:left-6'
            } z-40 w-[280px] sm:w-[380px] max-w-[calc(100vw-16px)] rounded-2xl bg-slate-950/95 text-white border border-slate-800 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Header with Title and Control Buttons */}
            <div className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-1 sm:gap-2 text-xs">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                  <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  Commercial
                </span>
                <span className="font-semibold text-slate-200 truncate text-[10px] sm:text-[11px]">
                  {currentBrand.brandName}
                </span>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                {/* Switch Dock Side (Left ↔ Right) */}
                <button
                  type="button"
                  onClick={toggleDockSide}
                  title={dockSide === 'right' ? 'Dock to Left side' : 'Dock to Right side'}
                  aria-label="Switch side"
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeftRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>

                {/* Pause / Play auto-rotation */}
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  title={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
                  aria-label="Toggle auto-play"
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  {isPaused ? <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                </button>

                {/* Collapse button */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  title="Collapse commercial"
                  aria-label="Collapse commercial"
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  title="Dismiss advertisement"
                  aria-label="Dismiss advertisement"
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Photographic Image Banner - Shorter on mobile */}
            <div className="relative h-28 sm:h-44 w-full bg-slate-900 overflow-hidden group">
              <img
                src={currentBrand.imageUrl}
                alt={currentBrand.brandName}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${currentBrand.gradient} opacity-30`} />

              {/* Badges on Image */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-black/75 backdrop-blur-md text-white border border-white/20">
                  <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />
                  {currentBrand.badgeText}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono text-white/90 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                  {currentBrand.displayHostname}
                </span>
              </div>

              {/* Bottom Brand Title Overlay */}
              <div className="absolute bottom-1.5 sm:bottom-2.5 left-2 sm:left-2.5 right-2 sm:right-2.5">
                <h3 className="text-sm sm:text-base font-extrabold text-white drop-shadow-md">
                  {currentBrand.brandName}
                </h3>
              </div>
            </div>

            {/* Details Body */}
            <div className="p-2.5 sm:p-3.5 space-y-2">
              <div>
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  <span>{currentBrand.categoryLabel}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Commercial Ad</span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5 leading-snug">
                  {currentBrand.headline}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
                  {currentBrand.valueProposition}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {currentBrand.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Carousel Navigation & Outbound Actions */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 sm:gap-2">
                {/* 7-Brand Step Controls with Clean Numeric Counter */}
                <div className="flex items-center gap-0.5 bg-slate-900 px-1 py-0.5 rounded-md border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTickerIndex((prev) => (prev - 1 + COMMERCIAL_CAMPAIGNS.length) % COMMERCIAL_CAMPAIGNS.length)}
                    title="Previous destination"
                    aria-label="Previous destination"
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>

                  <span className="text-[10px] font-mono font-bold text-slate-300 px-1 select-none">
                    {tickerIndex + 1}/{COMMERCIAL_CAMPAIGNS.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => setTickerIndex((prev) => (prev + 1) % COMMERCIAL_CAMPAIGNS.length)}
                    title="Next destination"
                    aria-label="Next destination"
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHubOpen(true)}
                    className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
                  >
                    All (7)
                  </button>

                  <a
                    href={getAttributedUrl(currentBrand, 'floating_card')}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordCommercialClick(currentBrand.id, 'floating_card')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-colors"
                  >
                    <span>Visit</span>
                    <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </a>
                </div>
              </div>
            </div>
          </aside>
        ) : (
          /* COLLAPSED SLEEK FLOATING PILL - Ultra-compact on mobile */
          <div
            className={`fixed top-16 sm:top-24 ${
              dockSide === 'right' ? 'right-2 sm:right-6' : 'left-2 sm:left-6'
            } z-40 animate-in fade-in duration-200`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 p-1 pl-1.5 pr-2 rounded-full bg-slate-950/95 text-white border border-slate-800 shadow-2xl backdrop-blur-xl group hover:border-blue-500/50 transition-all">
              {/* Flip Side Button */}
              <button
                type="button"
                onClick={toggleDockSide}
                title={dockSide === 'right' ? 'Dock to Left side' : 'Dock to Right side'}
                aria-label="Switch side"
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeftRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>

              {/* Thumbnail of active rotating brand */}
              <div
                onClick={() => setIsExpanded(true)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden shrink-0 border border-slate-700 cursor-pointer"
              >
                <img
                  src={currentBrand.imageUrl}
                  alt={currentBrand.brandName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Text label */}
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="flex flex-col text-left cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-blue-400">
                    Sponsored
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono text-slate-400">
                    [{tickerIndex + 1}/7]
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-white max-w-[90px] sm:max-w-[130px] truncate leading-tight">
                  {currentBrand.brandName}
                </span>
              </button>

              {/* Expand Trigger */}
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="ml-0.5 inline-flex items-center gap-0.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors"
              >
                <span>View</span>
                <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          </div>
        )
      ) : (
        /* MINIMIZED FLOATING ICON PILL (If dismissed) */
        <div
          className={`fixed top-16 sm:top-24 ${
            dockSide === 'right' ? 'right-2 sm:right-6' : 'left-2 sm:left-6'
          } z-40`}
        >
          <button
            type="button"
            onClick={() => {
              setIsDismissed(false);
              setIsExpanded(true);
            }}
            title="Open Commercial Advertisement"
            aria-label="Open Commercial Advertisement"
            className="group flex items-center gap-1 p-1.5 sm:p-2 rounded-full bg-slate-950/90 text-white border border-slate-800 shadow-xl hover:border-blue-500 backdrop-blur-md transition-all"
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] sm:text-[10px] font-bold hidden group-hover:inline pr-1">
              Ad [7]
            </span>
          </button>
        </div>
      )}

      {/* 3. Commercial Hub Modal with React Portal */}
      <CommercialHubModal isOpen={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
};
