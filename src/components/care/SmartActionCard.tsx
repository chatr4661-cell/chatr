import React from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  Pill, 
  AlertTriangle, 
  Heart, 
  Activity,
  Calendar,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SmartAction {
  id: string;
  type: 'call_doctor' | 'refill' | 'emergency' | 'vital_alert' | 'followup' | 'lab';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
  action: () => void;
}

interface SmartActionCardProps {
  action: SmartAction;
  delay?: number;
}

const actionConfig = {
  call_doctor: { 
    icon: Phone, 
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50'
  },
  refill: { 
    icon: Pill, 
    gradient: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50'
  },
  emergency: { 
    icon: AlertTriangle, 
    gradient: 'from-red-500 to-rose-600',
    bg: 'bg-red-50'
  },
  vital_alert: { 
    icon: Activity, 
    gradient: 'from-orange-500 to-amber-600',
    bg: 'bg-orange-50'
  },
  followup: { 
    icon: Calendar, 
    gradient: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50'
  },
  lab: { 
    icon: Heart, 
    gradient: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-50'
  },
};

const urgencyConfig = {
  low: { color: 'bg-gray-100 text-gray-700', pulse: false },
  medium: { color: 'bg-yellow-100 text-yellow-700', pulse: false },
  high: { color: 'bg-orange-100 text-orange-700', pulse: true },
  critical: { color: 'bg-red-100 text-red-700', pulse: true },
};

export function SmartActionCard({ action, delay = 0 }: SmartActionCardProps) {
  const config = actionConfig[action.type];
  const urgency = urgencyConfig[action.urgency];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card 
        className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
          action.urgency === 'critical' ? 'border-red-300 shadow-red-100' : ''
        }`}
        onClick={action.action}
      >
        <CardContent className="p-0">
          <div className="flex items-center">
            {/* Icon */}
            <div className={`w-16 h-16 bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
              <motion.div
                animate={urgency.pulse ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Icon className="h-7 w-7 text-white" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">{action.title}</h3>
                {action.urgency !== 'low' && (
                  <Badge className={`${urgency.color} text-[10px] py-0`}>
                    {action.urgency === 'critical' ? '⚠️ Now' : action.urgency}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{action.description}</p>
              {action.context && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] text-primary font-medium">{action.context}</span>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="pr-4">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
