import { motion } from "framer-motion";
import { Signal, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import { cn } from "@/lib/utils";

interface QualityIndicatorProps {
  quality: 'excellent' | 'good' | 'poor' | 'reconnecting';
  className?: string;
  showLabel?: boolean;
}

export function QualityIndicator({ quality, className, showLabel = false }: QualityIndicatorProps) {
  const qualityConfig = {
    excellent: {
      icon: SignalHigh,
      color: 'text-green-500',
      bars: 4,
      label: 'Excellent'
    },
    good: {
      icon: SignalMedium,
      color: 'text-yellow-500',
      bars: 3,
      label: 'Good'
    },
    poor: {
      icon: SignalLow,
      color: 'text-orange-500',
      bars: 2,
      label: 'Poor'
    },
    reconnecting: {
      icon: Signal,
      color: 'text-red-500',
      bars: 1,
      label: 'Reconnecting'
    }
  };

  const config = qualityConfig[quality];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex items-center gap-2", className)}
    >
      {/* Signal bars */}
      <div className="flex items-end gap-0.5 h-5">
        {[1, 2, 3, 4].map((bar) => (
          <motion.div
            key={bar}
            className={cn(
              "w-1 rounded-full transition-all duration-300",
              bar <= config.bars ? config.color : "bg-white/20"
            )}
            style={{ height: `${bar * 25}%` }}
            animate={{
              opacity: bar <= config.bars ? 1 : 0.3,
            }}
          />
        ))}
      </div>

      {showLabel && (
        <span className={cn("text-xs font-medium", config.color)}>
          {config.label}
        </span>
      )}

      {quality === 'reconnecting' && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className={config.color}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      )}
    </motion.div>
  );
}
