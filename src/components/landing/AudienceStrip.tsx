import React from 'react';
import { User, Globe2, ShieldCheck, HeartPulse, Sparkles } from 'lucide-react';

interface AudienceSegment {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}

const segments: AudienceSegment[] = [
  {
    icon: User,
    title: 'Everyday People',
    subtitle: 'Fast, spam-free communication',
  },
  {
    icon: Globe2,
    title: 'Global Callers',
    subtitle: 'Real-time live call translation',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy Conscious',
    subtitle: 'Direct chat without saved contacts',
  },
  {
    icon: HeartPulse,
    title: 'Health & Wellness',
    subtitle: 'AI symptom checker & medicine sync',
  },
  {
    icon: Sparkles,
    title: 'Smart Assistants',
    subtitle: 'AI answer & voice summaries',
  },
];

export const AudienceStrip: React.FC = () => {
  return (
    <section id="audiences" className="border-y border-[#DDE3DF] bg-white/70 py-6 sm:py-8 my-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-4 items-center">
          
          {segments.map((seg, idx) => (
            <div 
              key={seg.title}
              className={`flex items-start gap-3.5 ${
                idx < segments.length - 1 ? 'lg:border-r lg:border-[#DDE3DF]/80 lg:pr-4' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-[#E8F0EB] text-[#164E3F] flex items-center justify-center shrink-0">
                <seg.icon className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-sm font-semibold text-[#111817] tracking-tight truncate">
                  {seg.title}
                </h4>
                <p className="text-xs text-[#53605C] leading-snug">
                  {seg.subtitle}
                </p>
              </div>
            </div>
          ))}

          {/* Right Pillar Badge: Zero Fake Numbers, Pure Credible Focus */}
          <div className="col-span-2 md:col-span-1 lg:col-span-1 lg:pl-3 flex flex-col justify-center border-t md:border-t-0 md:border-l border-[#DDE3DF]/80 pt-4 md:pt-0">
            <div className="space-y-0.5 text-right lg:text-left">
              <div className="text-[10px] font-bold tracking-[0.22em] text-[#164E3F] uppercase">
                REAL PEOPLE
              </div>
              <div className="text-[10px] font-bold tracking-[0.22em] text-[#2E6B59] uppercase">
                REAL LIVES
              </div>
              <div className="text-[10px] font-bold tracking-[0.22em] text-[#111817] uppercase">
                REAL FREEDOM
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
