import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Phone, 
  Stethoscope, 
  Utensils,
  Search,
  Store,
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModuleRegistry } from '@/services/moduleRegistry/useModuleRegistry';

export const QuickActions = () => {
  const navigate = useNavigate();
  const { isModuleVisible } = useModuleRegistry();

  const actions = [
    {
      icon: MessageCircle,
      label: 'New Chat',
      route: '/chat',
      color: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/20',
      action: () => navigate('/chat')
    },
    {
      icon: Phone,
      label: 'Call',
      route: '/calls',
      color: 'from-blue-500 to-indigo-600',
      shadowColor: 'shadow-blue-500/20',
      action: () => navigate('/calls')
    },
    {
      icon: Coins,
      label: 'Earn',
      route: '/earn',
      color: 'from-amber-500 to-yellow-600',
      shadowColor: 'shadow-amber-500/20',
      action: () => navigate('/earn')
    },
    {
      icon: Store,
      label: 'Dhandha',
      sublabel: 'Business',
      route: '/dhandha',
      color: 'from-orange-500 to-amber-600',
      shadowColor: 'shadow-orange-500/20',
      action: () => navigate('/dhandha')
    },
    {
      icon: Stethoscope,
      label: 'Doctor',
      route: '/local-healthcare',
      color: 'from-rose-500 to-red-600',
      shadowColor: 'shadow-rose-500/20',
      action: () => navigate('/local-healthcare')
    },
    {
      icon: Utensils,
      label: 'Food',
      route: '/food-ordering',
      color: 'from-orange-500 to-amber-600',
      shadowColor: 'shadow-orange-500/20',
      action: () => navigate('/food-ordering')
    },
    {
      icon: Search,
      label: 'Search',
      route: '/chatr-world',
      color: 'from-purple-500 to-pink-600',
      shadowColor: 'shadow-purple-500/20',
      action: () => navigate('/chatr-world')
    }
  ];

  const visibleActions = actions.filter(action => isModuleVisible(action.route));

  return (
    <div className="rounded-3xl bg-card/75 backdrop-blur-md border border-border/60 p-3 sm:p-4 shadow-xs">
      <div className={cn(
        "grid gap-2 sm:gap-3",
        visibleActions.length <= 4 ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6"
      )}>
        {visibleActions.map((action) => (
          <button
            key={action.label}
            onClick={action.action}
            className="flex flex-col items-center justify-center gap-1.5 py-1.5 px-1 rounded-2xl hover:bg-muted/50 transition-all duration-200 group active:scale-95"
          >
            <div className={cn(
              "w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-sm",
              "bg-gradient-to-br group-hover:scale-105 group-hover:shadow-md",
              action.color,
              action.shadowColor
            )}>
              <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.2} />
            </div>
            <div className="text-center">
              <span className="text-[11px] sm:text-xs font-semibold text-foreground group-hover:text-primary transition-colors block leading-tight">
                {action.label}
              </span>
              {(action as any).sublabel && (
                <span className="text-[9px] text-muted-foreground block leading-tight mt-0.5">
                  {(action as any).sublabel}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
