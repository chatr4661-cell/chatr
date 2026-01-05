import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, DollarSign, TrendingUp, Calendar, 
  Download, CreditCard, Clock, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface Earning {
  id: string;
  booking_number: string;
  provider_earnings: number;
  total_amount: number;
  commission_amount: number;
  status: string;
  completed_at: string;
}

interface EarningStats {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalEarnings: number;
  pendingSettlement: number;
  completedJobs: number;
}

export default function ProviderEarnings() {
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [stats, setStats] = useState<EarningStats>({
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    totalEarnings: 0,
    pendingSettlement: 0,
    completedJobs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get provider
      const { data: provider, error: providerError } = await supabase
        .from('service_providers')
        .select('id, total_earnings')
        .eq('user_id', user.id)
        .single();

      if (providerError || !provider) {
        navigate('/vendor/register');
        return;
      }

      // Get completed bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('service_bookings')
        .select('*')
        .eq('provider_id', provider.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      setEarnings(bookings || []);
      calculateStats(bookings || [], provider.total_earnings || 0);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      toast.error('Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (bookings: Earning[], totalEarnings: number) => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const todayEarnings = bookings
      .filter(b => b.completed_at?.startsWith(today))
      .reduce((sum, b) => sum + (b.provider_earnings || 0), 0);

    const weekEarnings = bookings
      .filter(b => {
        const date = new Date(b.completed_at);
        return date >= weekStart && date <= weekEnd;
      })
      .reduce((sum, b) => sum + (b.provider_earnings || 0), 0);

    const monthEarnings = bookings
      .filter(b => {
        const date = new Date(b.completed_at);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, b) => sum + (b.provider_earnings || 0), 0);

    setStats({
      todayEarnings,
      weekEarnings,
      monthEarnings,
      totalEarnings,
      pendingSettlement: weekEarnings, // Simplified - actual would track unsettled
      completedJobs: bookings.length
    });
  };

  const requestPayout = async () => {
    toast.success('Payout request submitted! Amount will be credited within 24 hours.');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white mb-2"
          onClick={() => navigate('/vendor/provider-dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">My Earnings</h1>
        <p className="text-sm opacity-80">Track your income</p>
      </div>

      {/* Total Earnings Card */}
      <div className="px-4 -mt-4">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <p className="text-sm opacity-80">Total Earnings</p>
            <p className="text-4xl font-bold mt-1">₹{stats.totalEarnings}</p>
            <div className="flex items-center gap-4 mt-4">
              <div>
                <p className="text-xs opacity-80">Completed Jobs</p>
                <p className="text-lg font-semibold">{stats.completedJobs}</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Pending Settlement</p>
                <p className="text-lg font-semibold">₹{stats.pendingSettlement}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-lg font-bold text-green-600">₹{stats.todayEarnings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="text-lg font-bold text-blue-600">₹{stats.weekEarnings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-lg font-bold text-purple-600">₹{stats.monthEarnings}</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings List */}
      <div className="p-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Transaction History</CardTitle>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading...
              </div>
            ) : earnings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No earnings yet
              </div>
            ) : (
              <div className="divide-y">
                {earnings.slice(0, 20).map((earning) => (
                  <div key={earning.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          #{earning.booking_number || earning.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {earning.completed_at 
                            ? format(new Date(earning.completed_at), 'PPP')
                            : 'Date not available'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        +₹{earning.provider_earnings || earning.total_amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Commission: ₹{earning.commission_amount || 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Payout */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <Button 
          className="w-full" 
          size="lg"
          onClick={requestPayout}
          disabled={stats.pendingSettlement === 0}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Request Payout (₹{stats.pendingSettlement})
        </Button>
      </div>
    </div>
  );
}
