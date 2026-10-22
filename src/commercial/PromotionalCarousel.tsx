import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Pause, Play, Sparkles, Globe2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { COMMERCIAL_CAMPAIGNS, getAttributedUrl } from './campaignRegistry';
import { recordCommercialImpression, recordCommercialClick } from './commercialAnalytics';
import type { CommercialCampaign } from './types';

interface PromotionalCarouselProps {
  context?: string;
  compact?: boolean;
  className?: string;
  autoRotate?: boolean;
}

export const PromotionalCarousel: React.FC<PromotionalCarouselProps> = ({
  context = 'home_carousel',
  compact = false,
  className = '',
  autoRotate = true,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewableCampaigns, setViewableCampaigns] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const campaigns = useMemo(() => COMMERCIAL_CAMPAIGNS.filter(c => c.enabled), []);

  // Viewable impression detection using IntersectionObserver
  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const currentCampaign = campaigns[activeIndex];
            if (currentCampaign && !viewableCampaigns.has(currentCampaign.id)) {
              recordCommercialImpression(currentCampaign.id, true, 1000);
              setViewableCampaigns(prev => new Set(prev).add(currentCampaign.id));
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeIndex, campaigns, viewableCampaigns]);

  // Auto-rotation timer (pause on hover/focus or user toggle)
  useEffect(() => {
    if (!autoRotate || isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % campaigns.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRotate, isPaused, campaigns.length]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % campaigns.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + campaigns.length) % campaigns.length);
  };

  const handleCardClick = (campaign: CommercialCampaign) => {
    recordCommercialClick(campaign.id, context);
  };

  if (!campaigns.length) return null;

  return (
    <section
      ref={containerRef}
      aria-label="Commercials that rotate inside CHATR"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative w-full overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      {/* Top Banner Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Commercial Showcase
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Verified business services across the CHATR ecosystem
            </p>
          </div>
        </div>

        {/* Carousel controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume auto-rotation' : 'Pause rotation'}
            aria-label={isPaused ? 'Resume rotation' : 'Pause rotation'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous commercial card"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-slate-500 px-1">
            {activeIndex + 1}/{campaigns.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next commercial card"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Card Presentation Grid / Carousel */}
      <div className="p-5 md:p-6">
        {/* Active featured campaign card */}
        {campaigns[activeIndex] && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visual Creative Left Side */}
            <div className="md:col-span-5 relative group">
              <div
                className={`relative w-full aspect-video md:aspect-[4/3] rounded-2xl p-6 text-white bg-gradient-to-br ${campaigns[activeIndex].gradient} shadow-lg flex flex-col justify-between overflow-hidden`}
              >
                {/* Background decorative glow */}
                <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-black/10 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/25">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {campaigns[activeIndex].badgeText}
                  </span>
                  <span className="text-xs font-mono opacity-80">
                    {campaigns[activeIndex].displayHostname}
                  </span>
                </div>

                <div className="relative z-10 my-auto py-2">
                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                    {campaigns[activeIndex].brandName}
                  </h3>
                  <p className="text-xs text-white/90 font-medium mt-1">
                    {campaigns[activeIndex].categoryLabel}
                  </p>
                </div>

                <div className="relative z-10 flex flex-wrap gap-1.5 pt-2">
                  {campaigns[activeIndex].tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-black/20 text-white/90 backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Campaign Messaging & CTA Right Side */}
            <div className="md:col-span-7 flex flex-col justify-center space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {campaigns[activeIndex].categoryLabel}
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                  {campaigns[activeIndex].headline}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {campaigns[activeIndex].valueProposition}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={getAttributedUrl(campaigns[activeIndex], context)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleCardClick(campaigns[activeIndex])}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {campaigns[activeIndex].ctaText}
                  <ExternalLink className="w-4 h-4" />
                </a>

                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                  <Globe2 className="w-3.5 h-3.5" />
                  https://{campaigns[activeIndex].displayHostname}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Carousel Thumbnail Dots & Quick Selector */}
        <div className="flex items-center justify-center gap-2 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
          {campaigns.map((camp, idx) => (
            <button
              key={camp.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Jump to ${camp.brandName}`}
              className={`h-2 rounded-full transition-all duration-200 ${
                idx === activeIndex
                  ? 'w-8 bg-blue-600 dark:bg-blue-400'
                  : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
