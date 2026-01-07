import React, { useState, useEffect } from 'react';
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

interface WidgetData {
  unreadChats: number;
  upcomingAppointments: number;
  walletBalance: number;
  healthAlerts: number;
  pendingNotifications: number;
}

export const ActivityWidgets = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<WidgetData>({
    unreadChats: 0,
    upcomingAppointments: 0,
    walletBalance: 0,
    healthAlerts: 0,
    pendingNotifications: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Use simple counts without complex type inference
        let unreadChats = 0;
        let appointments = 0;
        let wallet = 0;
        let notifications = 0;

        try {
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);
          notifications = count || 0;
        } catch {}

        try {
          const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', user.id)
            .gte('appointment_date', new Date().toISOString());
          appointments = count || 0;
        } catch {}

        try {
          const { data: walletData } = await supabase
            .from('chatr_coin_balances')
            .select('total_coins')
            .eq('user_id', user.id)
            .maybeSingle();
          wallet = walletData?.total_coins || 0;
        } catch {}

        setData({
          unreadChats,
          upcomingAppointments: appointments,
          walletBalance: wallet,
          healthAlerts: 0,
          pendingNotifications: notifications
        });
      } catch (error) {
        console.error('Error fetching activity data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivityData();
  }, []);

  const widgets = [
    {
      icon: MessageCircle,
      label: 'Chats',
      value: data.unreadChats > 0 ? `${data.unreadChats} unread` : 'All caught up',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-600 dark:text-green-400',
      route: '/chat',
      hasActivity: data.unreadChats > 0
    },
    {
      icon: Calendar,
      label: 'Appointments',
      value: data.upcomingAppointments > 0 ? `${data.upcomingAppointments} upcoming` : 'None scheduled',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
      route: '/care',
      hasActivity: data.upcomingAppointments > 0
    },
    {
      icon: Wallet,
      label: 'Wallet',
      value: `₹${data.walletBalance.toLocaleString()}`,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-600 dark:text-amber-400',
      route: '/chatr-wallet',
      hasActivity: false
    },
    {
      icon: Bell,
      label: 'Alerts',
      value: data.pendingNotifications > 0 ? `${data.pendingNotifications} new` : 'No alerts',
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-600 dark:text-purple-400',
      route: '/notifications',
      hasActivity: data.pendingNotifications > 0
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
          {/* Activity indicator */}
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
