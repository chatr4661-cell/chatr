import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  X,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Alert {
  id: string;
  type: 'warning' | 'success' | 'info' | 'critical';
  title: string;
  message: string;
  metric?: {
    name: string;
    trend: 'up' | 'down' | 'stable';
    value: string;
    duration: string;
  };
  action?: {
    label: string;
    route: string;
  };
}

interface PreventiveAlertProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

const alertConfig = {
  warning: { 
    icon: AlertTriangle, 
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700'
  },
  success: { 
    icon: CheckCircle, 
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconColor: 'text-green-500',
    badge: 'bg-green-100 text-green-700'
  },
  info: { 
    icon: Activity, 
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700'
  },
  critical: { 
    icon: AlertTriangle, 
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700'
  },
};

export function PreventiveAlert({ alerts, onDismiss }: PreventiveAlertProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Activity className="h-5 w-5 text-primary" />
        </motion.div>
        <h3 className="font-semibold">Health Insights</h3>
        <Badge variant="secondary" className="text-[10px]">AI Powered</Badge>
      </div>

      <AnimatePresence>
        {alerts.map((alert, idx) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, x: -100, height: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={`${config.bg} ${config.border} border`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${config.iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{alert.title}</h4>
                        {onDismiss && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => onDismiss(alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                      
                      {alert.metric && (
                        <div className="flex items-center gap-2 mt-2 bg-background/50 rounded-lg px-2 py-1.5">
                          {alert.metric.trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                          {alert.metric.trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                          {alert.metric.trend === 'stable' && <Activity className="h-4 w-4 text-blue-500" />}
                          <span className="text-xs font-medium">{alert.metric.name}:</span>
                          <span className="text-xs">{alert.metric.value}</span>
                          <span className="text-[10px] text-muted-foreground">({alert.metric.duration})</span>
                        </div>
                      )}

                      {alert.action && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 h-7 text-xs gap-1 p-0 hover:bg-transparent"
                        >
                          {alert.action.label}
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
