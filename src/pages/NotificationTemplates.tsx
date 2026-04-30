import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Phone, Calendar as CalendarIcon, Sparkles,
  Coins, ArrowRight,
} from 'lucide-react';
import { AppleHeader } from '@/components/ui/AppleHeader';
import { AppleCard } from '@/components/ui/AppleCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import { resolveNotificationRoute } from '@/utils/notificationRouter';
import { cn } from '@/lib/utils';

type Category = 'missed' | 'lifestyle' | 'earning' | 'calendar';

interface Template {
  id: string;
  category: Category;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, any>;
  action_url?: string;
  when: string;
  rationale: string;
}

const TEMPLATES: Template[] = [
  // Missed
  {
    id: 'missed-call-1',
    category: 'missed',
    type: 'call',
    title: 'Missed call',
    body: 'Priya called you',
    metadata: { caller_id: 'demo-user-priya', count: '1' },
    when: 'Within 60 min of a missed call',
    rationale: 'Single missed call from one contact.',
  },
  {
    id: 'missed-call-many',
    category: 'missed',
    type: 'call',
    title: '3 missed calls',
    body: 'Rahul tried to reach you 3 times',
    metadata: { caller_id: 'demo-user-rahul', count: '3' },
    when: 'When the same caller rang you ≥2 times in the last hour',
    rationale: 'Grouped — one push per caller, not per call.',
  },
  {
    id: 'missed-msg',
    category: 'missed',
    type: 'message',
    title: 'Unread from Asha',
    body: '4 new messages waiting',
    metadata: { sender_id: 'demo-user-asha', count: '4' },
    when: 'Unread messages older than 30 min',
    rationale: 'Hourly bucket prevents repeat pings for the same thread.',
  },

  // Lifestyle / AI nudges
  {
    id: 'wellness-morning',
    category: 'lifestyle',
    type: 'wellness',
    title: 'Hydrate first',
    body: 'Start with a glass of water — your brain wakes up faster.',
    metadata: { slot: 'morning' },
    when: '10:00 AM IST',
    rationale: 'AI-crafted morning nudge (Lovable AI · gemini-2.5-flash-lite).',
  },
  {
    id: 'wellness-afternoon',
    category: 'lifestyle',
    type: 'wellness',
    title: 'Step away',
    body: "You haven't walked in a while. A 3-min walk resets focus.",
    metadata: { slot: 'afternoon' },
    when: '3:00 PM IST',
    rationale: 'Movement nudge — AI varies wording each day.',
  },
  {
    id: 'wellness-night',
    category: 'lifestyle',
    type: 'wellness',
    title: 'Phone away soon',
    body: 'Try setting it across the room for tomorrow’s energy.',
    metadata: { slot: 'night' },
    when: '9:00 PM IST',
    rationale: 'Evening wind-down nudge.',
  },

  // Earning
  {
    id: 'earn-fresh',
    category: 'earning',
    type: 'earning',
    title: '7 fresh missions',
    body: 'New tasks just dropped. Tap to start earning Chatr Points.',
    metadata: { count: '7' },
    when: '11:00 AM and 6:00 PM IST',
    rationale: 'Only fires if active micro-tasks were created in last 24 h.',
  },
  {
    id: 'earn-mission',
    category: 'earning',
    type: 'earning',
    title: 'Voice review · ₹50',
    body: 'Record a 30-second audio review for Café Mocha.',
    metadata: { mission_id: 'demo-mission-123' },
    action_url: '/earn?mission=demo-mission-123',
    when: 'Per-mission deep link from share sheet',
    rationale: 'Opens claim flow directly inside /earn.',
  },

  // Calendar
  {
    id: 'appt-30',
    category: 'calendar',
    type: 'appointment',
    title: 'Appointment in 30 min',
    body: 'Get ready — tap for details.',
    metadata: { appointment_id: 'demo-appt-456' },
    when: '15–45 min before appointment_date',
    rationale: 'One-time per appointment (24 h dedupe).',
  },
];

const CAT_META: Record<
  Category,
  { label: string; icon: React.ReactNode; color: string }
> = {
  missed: { label: 'Missed', icon: <Phone className="w-4 h-4" />, color: 'text-emerald-500' },
  lifestyle: { label: 'AI nudges', icon: <Sparkles className="w-4 h-4" />, color: 'text-primary' },
  earning: { label: 'Earning', icon: <Coins className="w-4 h-4" />, color: 'text-amber-500' },
  calendar: { label: 'Calendar', icon: <CalendarIcon className="w-4 h-4" />, color: 'text-blue-500' },
};

function iconForType(t: string) {
  const c = 'w-5 h-5';
  switch (t) {
    case 'call': return <Phone className={cn(c, 'text-emerald-500')} />;
    case 'message': return <MessageSquare className={cn(c, 'text-primary')} />;
    case 'wellness': return <Sparkles className={cn(c, 'text-primary')} />;
    case 'earning': return <Coins className={cn(c, 'text-amber-500')} />;
    case 'appointment': return <CalendarIcon className={cn(c, 'text-blue-500')} />;
    default: return <MessageSquare className={cn(c, 'text-muted-foreground')} />;
  }
}

export default function NotificationTemplates() {
  const navigate = useNavigate();
  const haptics = useNativeHaptics();
  const [tab, setTab] = useState<'all' | Category>('all');

  const list = useMemo(
    () => (tab === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.category === tab)),
    [tab],
  );

  return (
    <div className="min-h-screen bg-background safe-area-pt safe-area-pb">
      <AppleHeader
        title="Notification Templates"
        subtitle="Preview every push the app may send"
        onBack={() => { haptics.light(); navigate(-1); }}
        showBack
      />

      <div className="px-4 pt-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="missed">Missed</TabsTrigger>
            <TabsTrigger value="lifestyle">AI</TabsTrigger>
            <TabsTrigger value="earning">Earn</TabsTrigger>
            <TabsTrigger value="calendar">Cal</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} />
        </Tabs>
      </div>

      <div className="px-4 py-4 space-y-3">
        {list.map((tpl) => {
          const route = resolveNotificationRoute({
            type: tpl.type,
            metadata: tpl.metadata,
            action_url: tpl.action_url ?? null,
          });
          const cat = CAT_META[tpl.category];
          return (
            <AppleCard key={tpl.id} padding="md">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('inline-flex items-center gap-1 text-xs font-medium', cat.color)}>
                  {cat.icon}
                  {cat.label}
                </span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono">
                  {tpl.type}
                </Badge>
                <span className="ml-auto text-[11px] text-muted-foreground">{tpl.when}</span>
              </div>

              {/* Lock-screen-style preview */}
              <div className="rounded-2xl bg-muted/40 border border-border p-3 mb-3">
                <div className="flex gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {iconForType(tpl.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{tpl.title}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">now</span>
                    </div>
                    <p className="text-sm text-foreground/80 mt-0.5 line-clamp-2">{tpl.body}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">{tpl.rationale}</p>

              <div className="flex items-center justify-between gap-2">
                <code className="text-[11px] text-muted-foreground truncate flex-1">{route}</code>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => { haptics.light(); navigate(route); }}
                >
                  Open
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </AppleCard>
          );
        })}
      </div>
    </div>
  );
}
