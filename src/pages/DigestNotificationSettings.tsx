import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppleHeader } from '@/components/ui/AppleHeader';
import { AppleCard } from '@/components/ui/AppleCard';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import {
  Wallet, Coins, Users, Trophy, MessageSquare, Phone,
  Calendar, UtensilsCrossed, Briefcase, HeartPulse, Sparkles,
} from 'lucide-react';

type CategoryKey =
  | 'wallet' | 'earnings' | 'referrals' | 'missions'
  | 'chats' | 'calls' | 'bookings' | 'food' | 'jobs' | 'wellness';

const DEFAULT_CATEGORIES: Record<CategoryKey, boolean> = {
  wallet: true, earnings: true, referrals: true, missions: true,
  chats: true, calls: true, bookings: true, food: true, jobs: true, wellness: true,
};

const CATEGORIES: Array<{
  key: CategoryKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'wallet',    label: 'Wallet balance',    description: 'Current balance & top-up reminders',     icon: Wallet },
  { key: 'earnings',  label: 'Earnings',          description: 'Pending coins from missions & rewards',  icon: Coins },
  { key: 'referrals', label: 'Referrals',         description: 'New signups & rewards from invites',     icon: Users },
  { key: 'missions',  label: 'Missions',          description: 'Active and new earning missions',         icon: Trophy },
  { key: 'chats',     label: 'Chats',             description: 'Unread messages summary',                 icon: MessageSquare },
  { key: 'calls',     label: 'Calls',             description: 'Missed calls in the last window',         icon: Phone },
  { key: 'bookings',  label: 'Bookings',          description: 'Upcoming services & appointments',        icon: Calendar },
  { key: 'food',      label: 'Food orders',       description: 'Active orders & delivery status',         icon: UtensilsCrossed },
  { key: 'jobs',      label: 'Jobs',              description: 'New job posts you may like',              icon: Briefcase },
  { key: 'wellness',  label: 'Wellness',          description: 'Medication & health reminders',           icon: HeartPulse },
];

export default function DigestNotificationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const haptics = useNativeHaptics();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [categories, setCategories] = useState<Record<CategoryKey, boolean>>(DEFAULT_CATEGORIES);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from('notification_preferences')
        .select('digest_enabled, digest_categories')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setDigestEnabled(data.digest_enabled ?? true);
        setCategories({ ...DEFAULT_CATEGORIES, ...((data.digest_categories as Record<CategoryKey, boolean>) ?? {}) });
      }
      setLoading(false);
    })();
  }, [navigate]);

  const persist = async (next: { digest_enabled?: boolean; digest_categories?: Record<CategoryKey, boolean> }) => {
    if (!userId) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      digest_enabled: next.digest_enabled ?? digestEnabled,
      digest_categories: next.digest_categories ?? categories,
    };
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
    }
  };

  const toggleMaster = async (val: boolean) => {
    haptics.light();
    setDigestEnabled(val);
    await persist({ digest_enabled: val });
  };

  const toggleCategory = async (key: CategoryKey, val: boolean) => {
    haptics.light();
    const next = { ...categories, [key]: val };
    setCategories(next);
    await persist({ digest_categories: next });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-pt safe-area-pb">
      <AppleHeader
        title="Digest categories"
        subtitle={!userId ? 'Sign in to manage' : (saving ? 'Saving…' : 'Choose what your 3-hour digest includes')}
        onBack={() => navigate(-1)}
        showBack
      />

      {!userId && (
        <div className="px-4 py-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Sign in to customize your digest</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You'll be able to choose which categories appear in your 3-hour summary.
            </p>
          </div>
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-medium"
          >
            Sign in
          </button>
        </div>
      )}

      {userId && <div className="px-4 py-3 space-y-3">
        <AppleCard padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Enable digest</h3>
              <p className="text-xs text-muted-foreground">
                Receive a personalized summary every 3 hours
              </p>
            </div>
            <Switch checked={digestEnabled} onCheckedChange={toggleMaster} />
          </div>
        </AppleCard>

        <div className={digestEnabled ? '' : 'opacity-50 pointer-events-none'}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground px-1 mb-2">
            Categories
          </p>
          <div className="space-y-2">
            {CATEGORIES.map(({ key, label, description, icon: Icon }) => (
              <AppleCard key={key} padding="md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
                  </div>
                  <Switch
                    checked={categories[key] ?? true}
                    onCheckedChange={(v) => toggleCategory(key, v)}
                  />
                </div>
              </AppleCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
