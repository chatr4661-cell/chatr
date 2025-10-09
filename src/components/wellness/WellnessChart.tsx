import React from 'react';
import { Card } from '@/components/ui/card';
import { Activity, Heart, Moon, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WellnessChartProps {
  data: any[];
  metric: 'steps' | 'heart_rate' | 'sleep_hours' | 'weight_kg';
}

const metricConfig = {
  steps: {
    label: 'Steps',
    icon: Activity,
    color: '#3b82f6',
    dataKey: 'steps',
  },
  heart_rate: {
    label: 'Heart Rate (bpm)',
    icon: Heart,
    color: '#ec4899',
    dataKey: 'heart_rate',
  },
  sleep_hours: {
    label: 'Sleep (hours)',
    icon: Moon,
    color: '#8b5cf6',
    dataKey: 'sleep_hours',
  },
  weight_kg: {
    label: 'Weight (kg)',
    icon: TrendingUp,
    color: '#10b981',
    dataKey: 'weight_kg',
  },
};

export function WellnessChart({ data, metric }: WellnessChartProps) {
  const config = metricConfig[metric];
  const Icon = config.icon;

  return (
    <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5" style={{ color: config.color }} />
        <h3 className="font-semibold text-foreground">{config.label} Trend (7 days)</h3>
      </div>
      
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            style={{ fontSize: '12px' }}
          />
          <YAxis style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
              border: 'none', 
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey={config.dataKey} 
            stroke={config.color} 
            strokeWidth={3}
            dot={{ fill: config.color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
