import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, MessageCircle, Phone, Stethoscope, Briefcase, Utensils,
  ShoppingBag, Palette, Trophy, Users, Sparkles, Coins, Store,
  Building2, Heart,
} from 'lucide-react';

type Stat = { label: string; value: number | string };

interface Module {
  key: string;
  title: string;
  description: string;
  route: string;
  icon: any;
  color: string;
  stats?: Stat[];
  badge?: string;
}

export default function EcosystemHub() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const safeCount = async (fn: () => Promise<{ count: number | null }>) => {
        try { const { count } = await fn(); return count ?? 0; } catch { return 0; }
      };

      const [
        chats, calls, appts, jobsApplied, jobsPosted, designs,
        orders, marketplaceOrders, points, referrals, champions,
      ] = await Promise.all([
        safeCount(() => supabase.from('conversations' as any).select('id', { count: 'exact', head: true }) as any),
        safeCount(() => supabase.from('calls' as any).select('id', { count: 'exact', head: true }).or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`) as any),
        safeCount(() => supabase.from('appointments' as any).select('id', { count: 'exact', head: true }).eq('patient_id', user.id) as any),
        safeCount(() => supabase.from('job_applications' as any).select('id', { count: 'exact', head: true }).eq('applicant_id', user.id) as any),
        safeCount(() => supabase.from('job_listings' as any).select('id', { count: 'exact', head: true }).eq('posted_by', user.id) as any),
        safeCount(() => supabase.from('studio_user_designs' as any).select('id', { count: 'exact', head: true }).eq('user_id', user.id) as any),
        safeCount(() => supabase.from('food_orders' as any).select('id', { count: 'exact', head: true }).eq('customer_id', user.id) as any),
        safeCount(() => supabase.from('marketplace_orders' as any).select('id', { count: 'exact', head: true }).eq('buyer_id', user.id) as any),
        (async () => {
          const { data } = await supabase.from('chatr_coin_balances' as any).select('balance').eq('user_id', user.id).maybeSingle();
          return (data as any)?.balance ?? 0;
        })(),
        safeCount(() => supabase.from('chatr_referrals' as any).select('id', { count: 'exact', head: true }).eq('referrer_id', user.id) as any),
        (async () => {
          const { data } = await supabase.from('champions' as any).select('points').eq('user_id', user.id).maybeSingle();
          return (data as any)?.points ?? 0;
        })(),
      ]);

      setCounts({
        chats, calls, appts, jobsApplied, jobsPosted, designs,
        orders, marketplaceOrders, points, referrals, champions,
      });
      setLoading(false);
    })();
  }, []);

  const modules: Module[] = [
    { key: 'chat', title: 'Chats', description: 'Messages & groups', route: '/chat', icon: MessageCircle, color: 'from-blue-400 to-blue-600',
      stats: [{ label: 'Conversations', value: counts.chats ?? 0 }] },
    { key: 'calls', title: 'Calls', description: 'Voice & video', route: '/calls', icon: Phone, color: 'from-green-400 to-emerald-600',
      stats: [{ label: 'Total', value: counts.calls ?? 0 }] },
    { key: 'health', title: 'Health', description: 'Doctors & care', route: '/health-hub', icon: Stethoscope, color: 'from-cyan-400 to-blue-500',
      stats: [{ label: 'Appointments', value: counts.appts ?? 0 }] },
    { key: 'apply', title: 'Apply', description: 'Find & post jobs', route: '/apply', icon: Briefcase, color: 'from-indigo-400 to-purple-600',
      stats: [{ label: 'Applied', value: counts.jobsApplied ?? 0 }, { label: 'Posted', value: counts.jobsPosted ?? 0 }] },
    { key: 'doctor-portal', title: 'Doctor Portal', description: 'Provider workspace', route: '/doctor-portal', icon: Heart, color: 'from-pink-400 to-rose-500' },
    { key: 'studio', title: 'Studio', description: 'Design marketing assets', route: '/chatr-studio', icon: Palette, color: 'from-fuchsia-400 to-pink-500',
      stats: [{ label: 'Designs', value: counts.designs ?? 0 }] },
    { key: 'food', title: 'Food', description: 'Local restaurants', route: '/food-ordering', icon: Utensils, color: 'from-orange-400 to-red-500',
      stats: [{ label: 'Orders', value: counts.orders ?? 0 }] },
    { key: 'marketplace', title: 'Marketplace', description: 'Shop products', route: '/marketplace', icon: ShoppingBag, color: 'from-amber-400 to-orange-500',
      stats: [{ label: 'Orders', value: counts.marketplaceOrders ?? 0 }] },
    { key: 'champions', title: 'Champions', description: 'Earn & rank up', route: '/champions', icon: Trophy, color: 'from-yellow-400 to-amber-500', badge: 'Earn',
      stats: [{ label: 'Points', value: counts.champions ?? 0 }] },
    { key: 'growth', title: 'Growth', description: 'Referrals & coins', route: '/chatr-growth', icon: Coins, color: 'from-emerald-400 to-green-600',
      stats: [{ label: 'Coins', value: counts.points ?? 0 }, { label: 'Referrals', value: counts.referrals ?? 0 }] },
    { key: 'communities', title: 'Communities', description: 'Groups & channels', route: '/communities', icon: Users, color: 'from-purple-400 to-indigo-500' },
    { key: 'dhandha', title: 'Dhandha', description: 'SMB voice billing', route: '/dhandha', icon: Building2, color: 'from-slate-500 to-slate-700' },
    { key: 'store', title: 'App Store', description: 'Mini apps & extensions', route: '/store', icon: Store, color: 'from-violet-400 to-purple-600' },
    { key: 'ai', title: 'Prechu AI', description: 'Your AI copilot', route: '/prechu', icon: Sparkles, color: 'from-cyan-400 to-teal-500', badge: 'AI' },
  ];

  return (
    <>
      <SEOHead title="Ecosystem · Chatr+" description="Your complete Chatr+ ecosystem — chats, calls, health, jobs, food, marketplace and more." />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background pb-20">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-base font-semibold">Ecosystem</h1>
              <p className="text-[11px] text-muted-foreground">All 14 modules · live activity</p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-5">
          {!userId && !loading && (
            <Card className="mb-4">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Sign in to see your personalized activity across the ecosystem.
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {modules.map((m) => (
              <Link key={m.key} to={m.route} className="group">
                <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-sm`}>
                        <m.icon className="w-4 h-4 text-white" />
                      </div>
                      {m.badge && <Badge variant="secondary" className="text-[10px]">{m.badge}</Badge>}
                    </div>
                    <div className="font-semibold text-sm">{m.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">{m.description}</div>
                    {m.stats && (
                      <div className="flex gap-3 mt-3 pt-3 border-t border-border/40">
                        {m.stats.map((s) => (
                          <div key={s.label}>
                            <div className="text-sm font-semibold">{loading ? '—' : s.value}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
