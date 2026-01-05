import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, TrendingDown, Users, Calendar,
  IndianRupee, Clock, Star, Activity, ChevronDown,
  BarChart3, PieChart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';

interface AnalyticsData {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalPatients: number;
  newPatients: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  appointmentsByDay: { date: string; count: number }[];
  topServices: { name: string; count: number; revenue: number }[];
}

export default function DoctorAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalPatients: 0,
    newPatients: 0,
    totalRevenue: 0,
    averageRating: 0,
    completionRate: 0,
    appointmentsByDay: [],
    topServices: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/vendor/login');
        return;
      }

      // Get provider ID
      let provId = null;
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id, rating_average')
        .eq('user_id', user.id)
        .single();

      if (provider) {
        provId = provider.id;
      } else {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id, rating')
          .eq('user_id', user.id)
          .eq('vendor_type', 'healthcare_provider')
          .single();

        if (!vendor) {
          navigate('/vendor/register');
          return;
        }
        provId = vendor.id;
      }

      const startDate = subDays(new Date(), parseInt(timeRange)).toISOString();
      const previousPeriodStart = subDays(new Date(), parseInt(timeRange) * 2).toISOString();

      // Get appointments in date range
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          appointment_date,
          status,
          cash_amount,
          service:services(service_name, base_price)
        `)
        .eq('provider_id', provId)
        .gte('appointment_date', startDate);

      const aptData = appointments || [];
      
      // Calculate metrics
      const completed = aptData.filter(a => a.status === 'completed');
      const cancelled = aptData.filter(a => a.status === 'cancelled' || a.status === 'no_show');
      const uniquePatients = new Set(aptData.map(a => a.patient_id));
      
      // Revenue calculation
      const totalRevenue = completed.reduce((sum, apt: any) => {
        return sum + (apt.cash_amount || apt.service?.base_price || 0);
      }, 0);

      // Appointments by day
      const dayMap = new Map<string, number>();
      aptData.forEach((apt: any) => {
        const day = format(parseISO(apt.appointment_date), 'yyyy-MM-dd');
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      });

      const appointmentsByDay = Array.from(dayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top services
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      completed.forEach((apt: any) => {
        const serviceName = apt.service?.service_name || 'Consultation';
        const price = apt.cash_amount || apt.service?.base_price || 0;
        const current = serviceMap.get(serviceName) || { count: 0, revenue: 0 };
        serviceMap.set(serviceName, {
          count: current.count + 1,
          revenue: current.revenue + price
        });
      });

      const topServices = Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get new patients (first appointment in this period)
      const { data: previousPatients } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('provider_id', provId)
        .lt('appointment_date', startDate);

      const existingPatientIds = new Set((previousPatients || []).map((p: any) => p.patient_id));
      const newPatients = Array.from(uniquePatients).filter(id => !existingPatientIds.has(id)).length;

      setAnalytics({
        totalAppointments: aptData.length,
        completedAppointments: completed.length,
        cancelledAppointments: cancelled.length,
        totalPatients: uniquePatients.size,
        newPatients,
        totalRevenue,
        averageRating: provider?.rating_average || 0,
        completionRate: aptData.length > 0 ? (completed.length / aptData.length) * 100 : 0,
        appointmentsByDay,
        topServices
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subValue, 
    trend, 
    color = 'primary' 
  }: { 
    icon: any; 
    label: string; 
    value: string | number; 
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center`}>
            <Icon className={`w-5 h-5 text-${color}`} />
          </div>
          {trend && (
            <Badge 
              variant="outline" 
              className={
                trend === 'up' ? 'text-green-600 border-green-200' : 
                trend === 'down' ? 'text-red-600 border-red-200' : ''
              }
            >
              {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : 
               trend === 'down' ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
              {subValue}
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold mt-3">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vendor/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Analytics</h1>
            <p className="text-xs text-muted-foreground">Track your practice performance</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Calendar}
            label="Total Appointments"
            value={analytics.totalAppointments}
            subValue={`${analytics.completedAppointments} completed`}
          />
          <StatCard
            icon={Users}
            label="Patients"
            value={analytics.totalPatients}
            subValue={`+${analytics.newPatients} new`}
            trend="up"
          />
          <StatCard
            icon={IndianRupee}
            label="Revenue"
            value={`₹${analytics.totalRevenue.toLocaleString()}`}
          />
          <StatCard
            icon={Star}
            label="Rating"
            value={analytics.averageRating.toFixed(1)}
            subValue="average"
          />
        </div>

        {/* Completion Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Appointment Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</span>
                <Badge variant="outline" className="text-green-600">
                  {analytics.completedAppointments} / {analytics.totalAppointments}
                </Badge>
              </div>
              <Progress value={analytics.completionRate} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Completed: {analytics.completedAppointments}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Cancelled: {analytics.cancelledAppointments}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Daily Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.appointmentsByDay.length > 0 ? (
              <div className="flex items-end gap-1 h-32">
                {analytics.appointmentsByDay.slice(-14).map((day, index) => {
                  const maxCount = Math.max(...analytics.appointmentsByDay.map(d => d.count));
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  return (
                    <motion.div
                      key={day.date}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: index * 0.05 }}
                      className="flex-1 bg-primary/80 rounded-t-sm min-h-[4px] relative group"
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-xs px-1 rounded whitespace-nowrap">
                        {day.count}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{analytics.appointmentsByDay[0]?.date ? format(parseISO(analytics.appointmentsByDay[0].date), 'MMM d') : '-'}</span>
              <span>{analytics.appointmentsByDay[analytics.appointmentsByDay.length - 1]?.date ? format(parseISO(analytics.appointmentsByDay[analytics.appointmentsByDay.length - 1].date), 'MMM d') : '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Top Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topServices.length > 0 ? (
              <div className="space-y-3">
                {analytics.topServices.map((service, index) => (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{service.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{service.count} appointments</span>
                        <span>•</span>
                        <span>₹{service.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No services data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Summary */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Period Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{analytics.totalPatients}</p>
                <p className="text-xs opacity-80">Patients Seen</p>
              </div>
              <div>
                <p className="text-2xl font-bold">₹{(analytics.totalRevenue / 1000).toFixed(1)}k</p>
                <p className="text-xs opacity-80">Revenue</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.completionRate.toFixed(0)}%</p>
                <p className="text-xs opacity-80">Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
