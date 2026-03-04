import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Calendar, 
  Wallet, 
  Heart,
  ChevronRight,
  Bell,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useInstantCache } from '@/hooks/useInstantCache';

interface WidgetData {
  unreadChats: number;
  upcomingAppointments: number;
  walletBalance: number;
  healthAlerts: number;
  pendingNotifications: number;
}

const defaultData: WidgetData = {
  unreadChats: 0,
  upcomingAppointments: 0,
  walletBalance: 0,
  healthAlerts: 0,
  pendingNotifications: 0
};

const fetchWidgetData = async (): Promise<WidgetData> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return defaultData;

  // All 3 queries run in PARALLEL
  const [notifRes, apptRes, walletRes] = await Promise.all([
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false).then(r => r.count || 0).catch(() => 0),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).gte('appointment_date', new Date().toISOString()).then(r => r.count || 0).catch(() => 0),
    supabase.from('chatr_coin_balances').select('total_coins').eq('user_id', user.id).maybeSingle().then(r => r.data?.total_coins || 0).catch(() => 0),
  ]);

  return {
    unreadChats: 0,
    upcomingAppointments: apptRes,
    walletBalance: walletRes,
    healthAlerts: 0,
    pendingNotifications: notifRes
  };
};

export const ActivityWidgets = () => {
  const navigate = useNavigate();
  const { data, loading } = useInstantCache<WidgetData>('activity-widgets', fetchWidgetData, { ttl: 3 * 60 * 1000 });
  
  const widgetData = data || defaultData;

  const widgets = [
    {
      icon: MessageCircle,
      label: 'Chats',
      value: widgetData.unreadChats > 0 ? `${widgetData.unreadChats} unread` : 'All caught up',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-600 dark:text-green-400',
      route: '/chat',
      hasActivity: widgetData.unreadChats > 0
    },
    {
      icon: Calendar,
      label: 'Appointments',
      value: widgetData.upcomingAppointments > 0 ? `${widgetData.upcomingAppointments} upcoming` : 'None scheduled',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
      route: '/care',
      hasActivity: widgetData.upcomingAppointments > 0
    },
    {
      icon: Wallet,
      label: 'Wallet',
      value: `₹${widgetData.walletBalance.toLocaleString()}`,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-600 dark:text-amber-400',
      route: '/chatr-wallet',
      hasActivity: false
    },
    {
      icon: Bell,
      label: 'Alerts',
      value: widgetData.pendingNotifications > 0 ? `${widgetData.pendingNotifications} new` : 'No alerts',
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-600 dark:text-purple-400',
      route: '/notifications',
      hasActivity: widgetData.pendingNotifications > 0
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {widgets.map((widget) => (
        <button
          key={widget.label}
          onClick={() => navigate(widget.route)}
          className={cn(
            "relative flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-[0.98]",
            widget.bgColor,
            "border-border/50 hover:border-primary/30 hover:shadow-md"
          )}
        >
          {widget.hasActivity && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            `bg-gradient-to-br ${widget.color}`
          )}>
            <widget.icon className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          
          <div className="flex-1 text-left min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">{widget.label}</p>
            <p className={cn("text-sm font-semibold truncate", widget.textColor)}>
              {widget.value}
            </p>
          </div>
          
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        </button>
      ))}
    </div>
  );
};
