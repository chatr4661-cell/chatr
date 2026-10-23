import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Calendar, 
  ChevronRight,
  Bell
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useInstantCache } from '@/hooks/useInstantCache';
import { useModuleRegistry } from '@/services/moduleRegistry/useModuleRegistry';

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

  const [notifRes, apptRes] = await Promise.all([
    (async () => { try { const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false); return count || 0; } catch { return 0; } })(),
    (async () => { try { const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).gte('appointment_date', new Date().toISOString()); return count || 0; } catch { return 0; } })(),
  ]);

  return {
    unreadChats: 0,
    upcomingAppointments: apptRes,
    walletBalance: 0,
    healthAlerts: 0,
    pendingNotifications: notifRes
  };
};

export const ActivityWidgets = () => {
  const navigate = useNavigate();
  const { isModuleVisible } = useModuleRegistry();
  const { data, loading } = useInstantCache<WidgetData>('activity-widgets', fetchWidgetData, { ttl: 3 * 60 * 1000 });
  
  const widgetData = data || defaultData;

  const widgets = [
    {
      icon: MessageCircle,
      label: 'Chats',
      value: widgetData.unreadChats > 0 ? `${widgetData.unreadChats} unread` : 'All caught up',
      gradient: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      route: '/chat',
      hasActivity: widgetData.unreadChats > 0
    },
    {
      icon: Calendar,
      label: 'Appointments',
      value: widgetData.upcomingAppointments > 0 ? `${widgetData.upcomingAppointments} upcoming` : 'None scheduled',
      gradient: 'from-blue-500 to-indigo-600',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      route: '/care',
      hasActivity: widgetData.upcomingAppointments > 0
    },
    {
      icon: Bell,
      label: 'Alerts',
      value: widgetData.pendingNotifications > 0 ? `${widgetData.pendingNotifications} new` : 'No alerts',
      gradient: 'from-purple-500 to-fuchsia-600',
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      route: '/notifications',
      hasActivity: widgetData.pendingNotifications > 0
    }
  ];

  const visibleWidgets = widgets.filter(w => isModuleVisible(w.route));

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
        ))}
      </div>
    );
  }

  if (visibleWidgets.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {visibleWidgets.map((widget) => (
        <button
          key={widget.label}
          onClick={() => navigate(widget.route)}
          className={cn(
            "group relative flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-card/80 backdrop-blur-md border border-border/60 transition-all duration-200 text-left",
            "hover:border-primary/40 hover:shadow-xs active:scale-[0.98]"
          )}
        >
          {widget.hasActivity && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
          )}
          
          <div className={cn(
            "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105",
            `bg-gradient-to-br ${widget.gradient}`
          )}>
            <widget.icon className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{widget.label}</p>
            <p className="text-xs font-bold text-foreground truncate mt-0.5 leading-tight">
              {widget.value}
            </p>
          </div>
          
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary shrink-0" />
        </button>
      ))}
    </div>
  );
};
