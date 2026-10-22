import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Sparkles, Globe2, ShieldCheck, Filter, ArrowRight } from 'lucide-react';
import { COMMERCIAL_CAMPAIGNS, getAttributedUrl } from './campaignRegistry';
import { recordCommercialClick } from './commercialAnalytics';
import type { CommercialCampaign } from './types';

interface CommercialHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommercialHubModal: React.FC<CommercialHubModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const categories = [
    { id: 'ALL', label: 'All 7 Destinations' },
    { id: 'CAREERS', label: 'Careers & Jobs' },
    { id: 'ACADEMY', label: 'AI Education' },
    { id: 'BUSINESS', label: 'Business OS' },
    { id: 'GOURMET', label: 'Kashmiri Gourmet' },
    { id: 'DIASPORA', label: 'NRI Services' },
    { id: 'TOOLS', label: 'Career Tools' },
  ];

  const filteredCampaigns = selectedCategory === 'ALL'
    ? COMMERCIAL_CAMPAIGNS
    : COMMERCIAL_CAMPAIGNS.filter(c => c.category === selectedCategory);

  const handleCardClick = (campaign: CommercialCampaign) => {
    recordCommercialClick(campaign.id, 'hub_modal');
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gateway-hub-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 id="gateway-hub-title" className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                CHATR Commercial Gateway
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verified commercial services and ecosystem partnerships
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Campaign Cards Grid with Images & Details */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[calc(92vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCampaigns.map(camp => (
              <article
                key={camp.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 overflow-hidden group"
              >
                {/* Visual Creative Header with Image */}
                <div className="relative w-full h-44 overflow-hidden bg-slate-900">
                  <img
                    src={camp.imageUrl}
                    alt={camp.brandName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback gradient if image fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {/* Gradient overlay for readability */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${camp.gradient} opacity-40 group-hover:opacity-30 transition-opacity`} />
                  
                  {/* Badges on image */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/20">
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                      {camp.badgeText}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-white/90 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded">
                      {camp.displayHostname}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-lg font-bold text-white drop-shadow-md">
                      {camp.brandName}
                    </h3>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {camp.headline}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                      {camp.valueProposition}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {camp.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <a
                      href={getAttributedUrl(camp, 'modal_card')}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleCardClick(camp)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs shrink-0"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
