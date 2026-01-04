import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <motion.div 
      className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t z-50 pb-safe"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/care/medicines' && location.pathname === '/care/medicines');
          
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all min-w-[60px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Active Background */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-primary/10 rounded-2xl"
                  layoutId="activeNavBg"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              
              {/* Icon */}
              <motion.div
                className="relative z-10"
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive && "text-primary"
                )} />
              </motion.div>
              
              {/* Label */}
              <span className={cn(
                "text-[10px] font-medium relative z-10 transition-colors",
                isActive && "text-primary font-semibold"
              )}>
                {item.label}
              </span>

              {/* Active Dot */}
              {isActive && (
                <motion.div
                  className="absolute -top-0.5 left-1/2 w-1 h-1 bg-primary rounded-full"
                  layoutId="activeNavDot"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ marginLeft: -2 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
