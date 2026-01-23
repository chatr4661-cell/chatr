import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Phone, 
  Stethoscope, 
  Utensils,
  Search,
  Store
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: MessageCircle,
      label: 'New Chat',
      color: 'from-green-500 to-emerald-600',
      action: () => navigate('/chat')
    },
    {
      icon: Phone,
      label: 'Call',
      color: 'from-blue-500 to-indigo-600',
      action: () => navigate('/calls')
    },
    {
      icon: Store,
      label: 'Dhandha',
      color: 'from-amber-500 to-orange-600',
      action: () => navigate('/dhandha')
    },
    {
      icon: Stethoscope,
      label: 'Doctor',
      color: 'from-red-500 to-rose-600',
      action: () => navigate('/local-healthcare')
    },
    {
      icon: Utensils,
      label: 'Food',
      color: 'from-orange-500 to-amber-600',
      action: () => navigate('/food-ordering')
    },
    {
      icon: Search,
      label: 'Search',
      color: 'from-purple-500 to-pink-600',
      action: () => navigate('/chatr-world')
    }
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.action}
          className="flex flex-col items-center gap-1.5 min-w-[60px] group"
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            "bg-gradient-to-br shadow-md group-hover:shadow-lg group-hover:scale-105 group-active:scale-95",
            action.color
          )}>
            <action.icon className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};
