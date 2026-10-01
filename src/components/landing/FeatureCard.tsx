import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface FeatureCardProps {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  icon: LucideIcon;
  badgeText?: string;
  onClick?: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  imageUrl,
  imageAlt,
  icon: Icon,
  badgeText,
  onClick,
}) => {
  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col bg-white rounded-2xl border border-[#DDE3DF] hover:border-[#164E3F]/40 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer"
    >
      {/* Editorial Thumbnail Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
        <img
          src={imageUrl}
          alt={imageAlt}
          loading="eager"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter contrast-[0.98] brightness-[0.98]"
        />
        {/* Subtle Gradient Scrim at bottom of image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
        
        {badgeText && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-semibold text-[#164E3F] shadow-xs">
            {badgeText}
          </span>
        )}
      </div>

      {/* Floating Circular Icon Badge Overlapping Image Border */}
      <div className="relative px-5 pt-3 pb-6 flex-1 flex flex-col">
        <div className="-mt-8 mb-3 w-10 h-10 rounded-xl bg-white border border-[#DDE3DF] text-[#164E3F] flex items-center justify-center shadow-sm group-hover:bg-[#E8F0EB] transition-colors">
          <Icon className="w-5 h-5 stroke-[2]" />
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-[#111817] tracking-tight group-hover:text-[#164E3F] transition-colors mb-1.5">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-[#53605C] leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};
