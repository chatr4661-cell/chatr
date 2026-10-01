import React from 'react';
import { MessageSquare, Globe2, ShieldCheck, HeartPulse, Sparkles, Users } from 'lucide-react';
import { FeatureCard, FeatureCardProps } from './FeatureCard';

interface FeatureGridProps {
  onCardClick?: (featureKey: string) => void;
}

const b2cFeatures: (Omit<FeatureCardProps, 'onClick'> & { key: string })[] = [
  {
    key: 'direct-chat',
    title: 'Direct Chat Without Saving',
    description: 'Send messages, notes, and media to any international number without saving it in your address book.',
    imageUrl: '/images/landing/chat.jpg',
    imageAlt: 'Direct chat with any phone number without saving contacts',
    icon: MessageSquare,
    badgeText: 'Zero Friction',
  },
  {
    key: 'call-translation',
    title: 'Live Voice & Video Translation',
    description: 'Speak in your mother tongue — Hindi, Arabic, English, or 40+ languages. Both sides hear dual-audio in real-time.',
    imageUrl: '/images/landing/connect.jpg',
    imageAlt: 'Live voice call translation across 40+ global languages',
    icon: Globe2,
    badgeText: '40+ Languages',
  },
  {
    key: 'spam-shield',
    title: 'AI Call Answering & Spam Shield',
    description: 'Never get interrupted by telemarketers. CHATR screens unknown callers politely and delivers instant text summaries.',
    imageUrl: '/images/landing/search.jpg',
    imageAlt: 'AI call screening and spam call protection',
    icon: ShieldCheck,
    badgeText: 'Zero Spam',
  },
  {
    key: 'health-hub',
    title: 'Health Hub & Personal Vitals',
    description: 'Store blood pressure, sugar readings, prescriptions, and lab reports. Get clear answers from your personal Health SI.',
    imageUrl: '/images/landing/ai-agents.jpg',
    imageAlt: 'Family health tracker, vitals logging, and personal health SI',
    icon: HeartPulse,
    badgeText: 'Family Care',
  },
  {
    key: 'universal-inbox',
    title: 'Universal Personal Timeline',
    description: 'Your notes, messages, reminders, and documents in one clean feed. Search everything in a fraction of a second.',
    imageUrl: '/images/landing/tools.jpg',
    imageAlt: 'Universal personal search and unified timeline',
    icon: Sparkles,
    badgeText: 'All-in-One',
  },
  {
    key: 'community-circles',
    title: 'Community Circles & Champions',
    description: 'Connect with verified local circles, neighborhood groups, and earn community rewards with Chatr Champions.',
    imageUrl: '/images/landing/opportunities.jpg',
    imageAlt: 'Local neighborhood circles and community rewards',
    icon: Users,
    badgeText: 'Local Circles',
  },
];

export const FeatureGrid: React.FC<FeatureGridProps> = ({ onCardClick }) => {
  return (
    <section id="features" className="py-16 sm:py-24 bg-[#F8F8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-[#164E3F]">
            <span className="w-5 h-[1.5px] bg-[#164E3F]" />
            <span>CONSUMER SUPER APP CAPABILITIES</span>
            <span className="w-5 h-[1.5px] bg-[#164E3F]" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111817]">
            Everything You Need. Pure Simplicity.
          </h2>

          <p className="text-base sm:text-lg text-[#53605C] leading-relaxed">
            From seamless international communication to spam defense and family health tracking — CHATR puts powerful personal intelligence at your fingertips.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {b2cFeatures.map((feature) => (
            <FeatureCard
              key={feature.key}
              title={feature.title}
              description={feature.description}
              imageUrl={feature.imageUrl}
              imageAlt={feature.imageAlt}
              icon={feature.icon}
              badgeText={feature.badgeText}
              onClick={() => onCardClick?.(feature.key)}
            />
          ))}
        </div>

      </div>
    </section>
  );
};
