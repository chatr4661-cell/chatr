import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight, Globe2, Briefcase, GraduationCap, Building2, ShoppingBag, HeartHandshake, FileText } from 'lucide-react';
import { shouldShowFirstLaunchCommercial, markFirstLaunchCommercialShown, recordCommercialImpression } from './commercialAnalytics';
import { COMMERCIAL_CAMPAIGNS } from './campaignRegistry';

interface FirstLaunchCommercialProps {
  onOpenGatewayHub?: () => void;
}

export const FirstLaunchCommercial: React.FC<FirstLaunchCommercialProps> = ({ onOpenGatewayHub }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [phase, setPhase] = useState<'brand' | 'ecosystem'>('brand');
  const [activeBrandIndex, setActiveBrandIndex] = useState(0);

  useEffect(() => {
    if (shouldShowFirstLaunchCommercial()) {
      setIsVisible(true);
      markFirstLaunchCommercialShown();
      recordCommercialImpression('first_launch_commercial_sequence', true, 0);

      // Phase 1 -> Phase 2 transition at 1.8s
      const timerPhase2 = setTimeout(() => {
        setPhase('ecosystem');
      }, 1800);

      // Cycle brands during ecosystem phase
      const cycleInterval = setInterval(() => {
        setActiveBrandIndex(prev => (prev + 1) % COMMERCIAL_CAMPAIGNS.length);
      }, 900);

      // Auto-dismiss sequence at 4.8s
      const timerDismiss = setTimeout(() => {
        setIsVisible(false);
      }, 4800);

      return () => {
        clearTimeout(timerPhase2);
        clearTimeout(timerDismiss);
        clearInterval(cycleInterval);
      };
    }
  }, []);

  // Keyboard accessibility: ESC key to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  if (!isVisible) return null;

  const currentBrand = COMMERCIAL_CAMPAIGNS[activeBrandIndex];

  return (
    <aside
      aria-label="Welcome to CHATR Ecosystem Commercial"
      className="fixed bottom-5 right-5 left-5 md:left-auto md:w-[440px] z-50 bg-slate-950/95 backdrop-blur-xl border border-slate-800 text-white shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      {/* Progress bar (4.8 seconds total duration) */}
      <div className="h-1 w-full bg-slate-800/80 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500 animate-[pulse_1.5s_infinite] w-full origin-left transition-all duration-[4800ms] ease-linear" />
      </div>

      <div className="p-4 md:p-5">
        {/* Header with Skip button */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-3 h-3" />
              CHATR Gateway
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {phase === 'brand' ? '01 / 02' : '02 / 02'}
            </span>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            aria-label="Skip commercial introduction"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Skip
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Phase 1: Brand Sequence */}
        {phase === 'brand' && (
          <div className="space-y-1.5 transition-opacity duration-300">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Welcome to CHATR
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              One platform. A world of possibilities. Experience next-generation communication with verified discovery across our business ecosystem.
            </p>
          </div>
        )}

        {/* Phase 2: Ecosystem Commercial Showcase */}
        {phase === 'ecosystem' && currentBrand && (
          <div className="space-y-2 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Featured Ecosystem Destination
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {activeBrandIndex + 1} of 7
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${currentBrand.gradient} text-white shrink-0`}>
                <Globe2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-bold text-white truncate">{currentBrand.brandName}</p>
                  <span className="text-[10px] text-slate-400">{currentBrand.displayHostname}</span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{currentBrand.headline}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsVisible(false);
                  if (onOpenGatewayHub) onOpenGatewayHub();
                }}
                className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
              >
                Browse all 7 brands
              </button>

              <button
                type="button"
                onClick={() => setIsVisible(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Continue to CHATR →
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
