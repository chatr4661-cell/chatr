import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Activity, 
  Pill, 
  FileText, 
  User 
} from 'lucide-react';

const navItems = [
  { icon: Heart, label: 'Hub', path: '/health' },
  { icon: Activity, label: 'Wellness', path: '/wellness' },
  { icon: Pill, label: 'Medicines', path: '/care/medicines' },
  { icon: FileText, label: 'Reports', path: '/lab-reports' },
  { icon: User, label: 'Passport', path: '/health-passport' },
];

export function HealthBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="bg-background/95 backdrop-blur-xl border-t border-border shadow-lg">
        <nav className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/health' && location.pathname.startsWith(item.path));
            
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  {isActive && (
                    <motion.div
                      layoutId="health-nav-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
