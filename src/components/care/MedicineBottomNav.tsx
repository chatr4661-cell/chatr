import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Pill, Activity, Bell, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/care/medicines' },
  { icon: Pill, label: 'Medicines', path: '/care/medicines/subscriptions' },
  { icon: Activity, label: 'Vitals', path: '/care/medicines/vitals' },
  { icon: Bell, label: 'Reminders', path: '/care/medicines/reminders' },
  { icon: Gift, label: 'Rewards', path: '/care/medicines/rewards' },
];

export const MedicineBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t z-50 pb-safe">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/care/medicines' && location.pathname === '/care/medicines');
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
