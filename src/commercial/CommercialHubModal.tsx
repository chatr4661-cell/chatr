import React, { useState } from 'react';
import { X, ExternalLink, Sparkles, Globe2, ShieldCheck, Filter } from 'lucide-react';
import { COMMERCIAL_CAMPAIGNS, getAttributedUrl } from './campaignRegistry';
import { recordCommercialClick } from './commercialAnalytics';
import type { CommercialCampaign } from './types';

interface CommercialHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommercialHubModal: React.FC<CommercialHubModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  const categories = [
    { id: 'ALL', label: 'All Destinations' },
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gateway-hub-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 id="gateway-hub-title" className="text-lg font-bold text-slate-900 dark:text-white">
                CHATR Commercial Gateway
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explore verified commercial services and partnerships across the ecosystem
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close gateway hub"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Campaign Cards Grid */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCampaigns.map(camp => (
              <article
                key={camp.id}
                className="flex flex-col justify-between p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                      <ShieldCheck className="w-3 h-3" />
                      {camp.badgeText}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {camp.displayHostname}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {camp.brandName}
                  </h3>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                    {camp.headline}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {camp.valueProposition}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {camp.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] text-slate-400 bg-slate-200/50 dark:bg-slate-800/50 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <a
                    href={getAttributedUrl(camp, 'gateway_hub_card')}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleCardClick(camp)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors shadow-sm"
                  >
                    {camp.ctaText}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
