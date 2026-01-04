import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface HealthQuickActionProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  color: string;
  bgColor: string;
  onClick: () => void;
  badge?: string | number;
  index?: number;
}

export function HealthQuickAction({
  icon: Icon,
  label,
  description,
  color,
  bgColor,
  onClick,
  badge,
  index = 0
}: HealthQuickActionProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex flex-col items-start p-4 rounded-2xl ${bgColor} border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 text-left group`}
    >
      {/* Badge */}
      {badge !== undefined && badge !== null && (
        <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}

      {/* Icon */}
      <div className={`p-2.5 rounded-xl ${color} bg-white/80 shadow-sm mb-3 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Label */}
      <h3 className="font-semibold text-sm text-foreground leading-tight mb-0.5">
        {label}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-[11px] text-muted-foreground leading-snug">
          {description}
        </p>
      )}
    </motion.button>
  );
}
