import React, { useEffect, useMemo, useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

type Category = 'missed' | 'lifestyle' | 'earning' | 'calendar';

interface Template {
  id: string;
  slug: string;
  category: Category;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, any>;
  action_url?: string | null;
  trigger_when: string;
  rationale: string;
  sort_order: number;
}

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await (supabase as any)
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!active) return;
      if (error) {
        console.error('[NotificationTemplates] load error:', error);
        setTemplates([]);
      } else {
        setTemplates((data ?? []) as Template[]);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel('notification_templates_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notification_templates' },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const list = useMemo(
    () => (tab === 'all' ? templates : templates.filter((t) => t.category === tab)),
    [tab, templates],
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="mt-3 text-sm text-muted-foreground">Loading templates…</p>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No templates available</p>
          </div>
        ) : (
          list.map((tpl) => {
            const route = resolveNotificationRoute({
              type: tpl.type,
              metadata: tpl.metadata,
              action_url: tpl.action_url ?? null,
            });
            const cat = CAT_META[tpl.category] ?? CAT_META.lifestyle;
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
                  <span className="ml-auto text-[11px] text-muted-foreground">{tpl.trigger_when}</span>
                </div>

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
          })
        )}
      </div>
    </div>
  );
}
