import { memo } from 'react';
import {
  Heart, GraduationCap, Stethoscope, ShoppingBag, Utensils, Bike, Wallet,
  TrendingUp, Music, Film, Train, Bus, Hotel, Briefcase, Activity, Gamepad2,
  Camera, MessageCircle, Users, Sparkles, Globe, Bot, Building2, Baby,
  Dumbbell, BookOpen, Pill, Droplet, Zap, ShieldCheck, type LucideIcon,
} from 'lucide-react';

type IconSpec = { Icon: LucideIcon; gradient: string };

// Keyword → branded icon + gradient (HSL-safe via tailwind classes)
const RULES: Array<{ match: RegExp; spec: IconSpec }> = [
  // Health & Care
  { match: /blood|donat/i, spec: { Icon: Droplet, gradient: 'from-rose-500 to-red-600' } },
  { match: /tutor|learn|edu|school|class/i, spec: { Icon: GraduationCap, gradient: 'from-violet-500 to-indigo-600' } },
  { match: /doctor|clinic|hospital|care|medic/i, spec: { Icon: Stethoscope, gradient: 'from-sky-500 to-blue-600' } },
  { match: /pharm|medicine|pill/i, spec: { Icon: Pill, gradient: 'from-emerald-500 to-teal-600' } },
  { match: /fit|gym|workout|yoga/i, spec: { Icon: Dumbbell, gradient: 'from-orange-500 to-amber-600' } },
  { match: /baby|child|kid/i, spec: { Icon: Baby, gradient: 'from-pink-400 to-rose-500' } },
  { match: /health|vital|wellness/i, spec: { Icon: Heart, gradient: 'from-emerald-400 to-teal-600' } },

  // Commerce & Food
  { match: /food|restaurant|eat|kitchen|swiggy|zomato/i, spec: { Icon: Utensils, gradient: 'from-orange-500 to-red-500' } },
  { match: /deliver|dunzo|courier/i, spec: { Icon: Bike, gradient: 'from-amber-500 to-orange-600' } },
  { match: /shop|store|mart|cart|meesho|flipkart|myntra|tata/i, spec: { Icon: ShoppingBag, gradient: 'from-fuchsia-500 to-pink-600' } },

  // Finance
  { match: /pay|wallet|upi|paytm|phonepe/i, spec: { Icon: Wallet, gradient: 'from-blue-500 to-indigo-600' } },
  { match: /stock|trade|invest|grow|zerodha|kite/i, spec: { Icon: TrendingUp, gradient: 'from-green-500 to-emerald-600' } },

  // Entertainment
  { match: /music|saavn|gaana|song/i, spec: { Icon: Music, gradient: 'from-purple-500 to-pink-500' } },
  { match: /video|stream|hotstar|movie|film/i, spec: { Icon: Film, gradient: 'from-slate-700 to-slate-900' } },
  { match: /game|play/i, spec: { Icon: Gamepad2, gradient: 'from-indigo-500 to-purple-600' } },

  // Travel
  { match: /train|irctc|rail/i, spec: { Icon: Train, gradient: 'from-red-500 to-rose-600' } },
  { match: /bus|redbus/i, spec: { Icon: Bus, gradient: 'from-red-400 to-orange-500' } },
  { match: /hotel|stay|oyo|room/i, spec: { Icon: Hotel, gradient: 'from-rose-500 to-pink-600' } },

  // Jobs
  { match: /job|naukri|intern|career|hire/i, spec: { Icon: Briefcase, gradient: 'from-blue-600 to-cyan-600' } },

  // Chatr-native
  { match: /chat|message|talk/i, spec: { Icon: MessageCircle, gradient: 'from-emerald-400 to-green-600' } },
  { match: /community|social|group/i, spec: { Icon: Users, gradient: 'from-purple-400 to-pink-500' } },
  { match: /ai|intelligence|assistant|bot|gpt|copilot/i, spec: { Icon: Sparkles, gradient: 'from-cyan-400 to-blue-600' } },
  { match: /clone|agent|robot/i, spec: { Icon: Bot, gradient: 'from-teal-400 to-cyan-600' } },
  { match: /browser|world|web/i, spec: { Icon: Globe, gradient: 'from-blue-400 to-indigo-600' } },
  { match: /business|dhandha|kirana|vendor|biz/i, spec: { Icon: Building2, gradient: 'from-blue-500 to-cyan-600' } },
  { match: /verified|official|trust/i, spec: { Icon: ShieldCheck, gradient: 'from-indigo-500 to-blue-600' } },
  { match: /photo|camera|moment/i, spec: { Icon: Camera, gradient: 'from-pink-500 to-fuchsia-600' } },
  { match: /earn|reward|coin|growth/i, spec: { Icon: Zap, gradient: 'from-yellow-400 to-orange-500' } },
  { match: /book|read|story/i, spec: { Icon: BookOpen, gradient: 'from-amber-500 to-yellow-600' } },
  { match: /activity|sport/i, spec: { Icon: Activity, gradient: 'from-lime-500 to-green-600' } },
];

// Stable fallback gradient based on first char (no purple-only mono look)
const FALLBACKS: IconSpec[] = [
  { Icon: Sparkles, gradient: 'from-blue-500 to-cyan-500' },
  { Icon: Sparkles, gradient: 'from-emerald-500 to-teal-500' },
  { Icon: Sparkles, gradient: 'from-orange-500 to-rose-500' },
  { Icon: Sparkles, gradient: 'from-violet-500 to-fuchsia-500' },
  { Icon: Sparkles, gradient: 'from-amber-500 to-orange-500' },
  { Icon: Sparkles, gradient: 'from-sky-500 to-indigo-500' },
];

function pickSpec(name: string, category?: string | null): IconSpec {
  const haystack = `${name} ${category || ''}`;
  for (const r of RULES) if (r.match.test(haystack)) return r.spec;
  const idx = (name.charCodeAt(0) || 0) % FALLBACKS.length;
  return FALLBACKS[idx];
}

interface Props {
  name: string;
  category?: string | null;
  iconUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { box: 'w-12 h-12 rounded-xl', icon: 'h-5 w-5' },
  md: { box: 'w-14 h-14 rounded-2xl', icon: 'h-6 w-6' },
  lg: { box: 'w-16 h-16 rounded-2xl', icon: 'h-7 w-7' },
};

/**
 * Domain-aware app icon. Renders the real icon_url when present and valid,
 * otherwise picks a Lucide icon + branded gradient based on the app name.
 */
export const AppIconBadge = memo(({ name, category, iconUrl, size = 'md', className = '' }: Props) => {
  const s = SIZES[size];
  // Only use real images when they look like real branded assets, not generic letter avatars
  const hasRealIcon = !!iconUrl && !/ui-avatars\.com/i.test(iconUrl);

  if (hasRealIcon) {
    return (
      <img
        src={iconUrl!}
        alt={name}
        className={`${s.box} object-cover shadow-sm ${className}`}
        loading="lazy"
        onError={(e) => {
          // Hide broken image; parent will re-render fallback if it tracks errors
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  const { Icon, gradient } = pickSpec(name, category);
  return (
    <div
      className={`${s.box} bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm ${className}`}
      aria-label={name}
    >
      <Icon className={`${s.icon} text-white`} strokeWidth={2.4} />
    </div>
  );
});

AppIconBadge.displayName = 'AppIconBadge';
