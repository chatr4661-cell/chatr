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
    <div className="rounded-2xl bg-card/75 backdrop-blur-md border border-border/60 p-2.5 sm:p-3 shadow-xs">
      <div className={cn(
        "grid gap-1.5 sm:gap-2",
        visibleActions.length <= 4 ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6"
      )}>
        {visibleActions.map((action) => (
          <button
            key={action.label}
            onClick={action.action}
            className="flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-xl hover:bg-muted/50 transition-all duration-200 group active:scale-95"
          >
            <div className={cn(
              "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-200 shadow-xs",
              "bg-gradient-to-br group-hover:scale-105 group-hover:shadow-md",
              action.color,
              action.shadowColor
            )}>
              <action.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="text-center">
              <span className="text-[10px] sm:text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors block leading-tight">
                {action.label}
              </span>
              {(action as any).sublabel && (
                <span className="text-[8px] text-muted-foreground block leading-tight">
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
