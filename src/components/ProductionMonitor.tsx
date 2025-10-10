import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useMessageQueue } from '@/hooks/useMessageQueue';

interface ProductionMonitorProps {
  userId: string;
}

export const ProductionMonitor = ({ userId }: ProductionMonitorProps) => {
  const [metrics, setMetrics] = useState({
    errorRate: 0,
    messageDeliveryRate: 100,
    averageLatency: 0,
    activeErrors: 0,
  });

  const { queueLength, isOnline } = useMessageQueue(userId);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [userId]);

  const loadMetrics = async () => {
    try {
      // Get error count from last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: errors } = await supabase
        .from('error_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo);

      // Get message delivery stats
      const { data: deliveryStats } = await supabase
        .from('message_delivery_status')
        .select('status')
        .eq('recipient_id', userId)
        .gte('created_at', oneHourAgo);

      const totalMessages = deliveryStats?.length || 0;
      const deliveredMessages = deliveryStats?.filter(s => s.status === 'delivered' || s.status === 'read').length || 0;
      const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 100;

      setMetrics({
        errorRate: errors?.length || 0,
        messageDeliveryRate: Math.round(deliveryRate),
        averageLatency: 0, // TODO: Calculate from network diagnostics
        activeErrors: errors?.length || 0,
      });
    } catch (error) {
      console.error('Failed to load production metrics:', error);
    }
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 95) return 'text-green-500';
    if (rate >= 85) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <CardDescription>Real-time production metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Connection</p>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={isOnline ? 'default' : 'destructive'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Queued Messages</p>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-bold">{queueLength}</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Delivery Rate</p>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${getStatusColor(metrics.messageDeliveryRate)}`}>
                {metrics.messageDeliveryRate}%
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Errors (1h)</p>
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-4 w-4 ${metrics.activeErrors > 0 ? 'text-red-500' : 'text-green-500'}`} />
              <span className="text-lg font-bold">{metrics.activeErrors}</span>
            </div>
          </div>
        </div>

        {metrics.activeErrors > 5 && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">
              ⚠️ High error rate detected - some features may be degraded
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
