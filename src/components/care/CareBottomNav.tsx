import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Stethoscope, Pill, Calendar, Video, 
  Heart, MapPin, Wallet, Plus
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Care', path: '/care', exact: true },
  { icon: Stethoscope, label: 'Doctors', path: '/local-healthcare' },
  { icon: Pill, label: 'Medicines', path: '/care/medicines' },
  { icon: Video, label: 'Consult', path: '/teleconsultation' },
  { icon: Wallet, label: 'Wallet', path: '/health-wallet' },
];

export function CareBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-pb"
    >
      <div className="max-w-4xl mx-auto px-2">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const active = isActive(item.path, (item as any).exact);
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors relative ${
                  active 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {active && (
                  <motion.div
                    layoutId="careNavIndicator"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                  />
                )}
                <item.icon className={`h-5 w-5 relative z-10 ${active ? 'text-primary' : ''}`} />
                <span className={`text-[10px] relative z-10 ${active ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
