import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Sparkles, Globe2, ShieldCheck, Filter, ArrowRight } from 'lucide-react';
import { COMMERCIAL_CAMPAIGNS, getAttributedUrl } from './campaignRegistry';
import { PromotionalCarousel } from './PromotionalCarousel';
import { recordCommercialClick } from './commercialAnalytics';
import { SEOHead } from '@/components/SEOHead';
import type { CommercialCampaign } from './types';

export default function CommercialGatewayPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All 7 Destinations' },
    { id: 'CAREERS', label: 'Careers & Jobs' },
    { id: 'ACADEMY', label: 'AI Education' },
    { id: 'BUSINESS', label: 'Business OS' },
    { id: 'GOURMET', label: 'Kashmiri Harvest' },
    { id: 'DIASPORA', label: 'NRI Services' },
    { id: 'TOOLS', label: 'ATS Resume' },
  ];

  const filteredCampaigns = selectedCategory === 'ALL'
    ? COMMERCIAL_CAMPAIGNS
    : COMMERCIAL_CAMPAIGNS.filter(c => c.category === selectedCategory);

  const handleCardClick = (campaign: CommercialCampaign) => {
    recordCommercialClick(campaign.id, 'gateway_page');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-20">
      <SEOHead
        title="Commercial Gateway — CHATR Ecosystem Services"
        description="Discover verified professional, educational, and artisanal services across the CHATR, TalentXcel, and Nuty Tales ecosystem."
        canonicalUrl="https://chatr.chat/gateway"
      />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to CHATR
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              <Sparkles className="w-3.5 h-3.5" />
              Ecosystem Gateway
            </span>
          </div>
        </div>
      </header>

      {/* Hero Header Section */}
      <main className="max-w-6xl mx-auto px-4 pt-10 sm:pt-14 space-y-10">
        <div className="max-w-3xl space-y-3">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Main platform
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-tight">
            Welcome to CHATR
          </h1>
          <p className="text-lg sm:text-xl font-medium text-slate-700 dark:text-slate-300">
            One platform. A world of possibilities.
          </p>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Your communication and AI experience, with a showcase of verified commercial services across the wider business ecosystem.
          </p>
        </div>

        {/* Section 1: The Commercials that rotate inside CHATR */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Commercials that rotate inside CHATR
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              7 Active Destinations
            </span>
          </div>

          <PromotionalCarousel context="gateway_hero_carousel" autoRotate={true} />
        </div>

        {/* Section 2: Explore All 7 Brands Matrix */}
        <div className="space-y-6 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                All 7 Commercial Destinations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Each destination serves its own specific audience and search intent
              </p>
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((camp) => (
              <article
                key={camp.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
              >
                {/* Visual Top Banner */}
                <div className={`p-6 bg-gradient-to-br ${camp.gradient} text-white relative`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-sm text-white">
                      <ShieldCheck className="w-3 h-3" />
                      {camp.badgeText}
                    </span>
                    <span className="text-[11px] font-mono text-white/80">
                      {camp.displayHostname}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold tracking-tight text-white mt-1">
                    {camp.brandName}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5 line-clamp-1">
                    {camp.categoryLabel}
                  </p>
                </div>

                {/* Content Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {camp.headline}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {camp.valueProposition}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {camp.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <a
                      href={getAttributedUrl(camp, 'gateway_grid_card')}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleCardClick(camp)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors shadow-sm"
                    >
                      {camp.ctaText}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
