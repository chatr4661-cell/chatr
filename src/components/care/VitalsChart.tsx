import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

interface VitalReading {
  date: string;
  value: number;
}

interface VitalsChartProps {
  vitalType: 'blood_sugar_fasting' | 'blood_sugar_pp' | 'bp_systolic' | 'bp_diastolic' | 'weight';
  title: string;
  unit: string;
  normalRange: { min: number; max: number };
  color: string;
}

export const VitalsChart = ({ vitalType, title, unit, normalRange, color }: VitalsChartProps) => {
  const [data, setData] = useState<VitalReading[]>([]);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [vitalType, period]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), daysAgo).toISOString();

      const { data: readings } = await supabase
        .from('chronic_vitals')
        .select('value, recorded_at')
        .eq('user_id', user.id)
        .eq('vital_type', vitalType)
        .gte('recorded_at', startDate)
        .order('recorded_at', { ascending: true });

      const chartData: VitalReading[] = (readings || []).map(r => ({
        date: format(new Date(r.recorded_at), 'dd MMM'),
        value: r.value
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error loading vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList className="h-7">
              <TabsTrigger value="7d" className="text-xs px-2 h-6">7D</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2 h-6">30D</TabsTrigger>
              <TabsTrigger value="90d" className="text-xs px-2 h-6">90D</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <Tooltip 
                contentStyle={{ 
                  fontSize: 12, 
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                formatter={(value: number) => [`${value} ${unit}`, title]}
              />
              <ReferenceLine y={normalRange.max} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={normalRange.min} stroke="#f59e0b" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500" />
            <span>High ({normalRange.max})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-amber-500" />
            <span>Low ({normalRange.min})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
