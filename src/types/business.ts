export interface BusinessLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
}

export interface BusinessContactInfo {
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  new_lead_alerts: boolean;
  daily_digest: boolean;
  order_notifications: boolean;
  review_notifications: boolean;
}

export interface DaySchedule {
  open: boolean;
  start: string;
  end: string;
}

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface PlanLimits {
  max_broadcasts: number;
  max_products: number;
  max_groups: number;
  team_members: number;
}

export interface PlanFeatures {
  broadcasts: boolean;
  catalog: boolean;
  groups: boolean;
  analytics: string;
  support: string;
  automation?: boolean;
  integrations?: boolean;
  white_label?: boolean;
  api_access?: boolean;
}
