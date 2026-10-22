import type { LucideIcon } from 'lucide-react';

export type CommercialCategory = 
  | 'CAREERS' 
  | 'ACADEMY' 
  | 'BUSINESS' 
  | 'GOURMET' 
  | 'DIASPORA' 
  | 'TOOLS';

export interface CommercialCampaign {
  id: string;
  brandName: string;
  destinationUrl: string;
  displayHostname: string;
  category: CommercialCategory;
  categoryLabel: string;
  headline: string;
  valueProposition: string;
  ctaText: string;
  badgeText: string;
  accentColor: string;
  gradient: string;
  cardBgLight: string;
  tags: string[];
  imageUrl: string;
  weight: number; // Rotation weighting factor (1 to 10)
  enabled: boolean;
}

export interface ImpressionRecord {
  campaignId: string;
  timestamp: string;
  viewable: boolean;
  viewableDurationMs: number;
  clicked: boolean;
}

export interface CommercialFrequencyPolicy {
  maxImpressionsPerDay: number;
  minIntervalBetweenShowsHours: number;
  autoPlayIntervalMs: number;
}
