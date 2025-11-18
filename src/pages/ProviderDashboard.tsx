import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, DollarSign, Star, TrendingUp, 
  Clock, CheckCircle, XCircle, Phone, MessageSquare 
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalBookings: number;
  completedBookings: number;
  totalEarnings: number;
  averageRating: number;
  pendingBookings: number;
}

interface Booking {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  total_amount: number;
  service_address: string;
  customer: {
    username: string;
    phone_number: string;
    avatar_url: string;
  };
  category: {
    name: string;
  };
}

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
    pendingBookings: 0
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string>('');

  useEffect(() => {
    initializeProvider();
  }, []);

  const initializeProvider = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!provider) {
        toast.error('Provider profile not found');
        return;
      }

      setProviderId(provider.id);
      await Promise.all([
        fetchStats(provider.id),
        fetchBookings(provider.id)
      ]);

      // Subscribe to real-time booking updates
      const channel = supabase
        .channel('provider-bookings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'service_bookings',
            filter: `provider_id=eq.${provider.id}`
          },
          () => {
            fetchBookings(provider.id);
            fetchStats(provider.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      toast.error('Failed to initialize dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (id: string) => {
    const { data: bookingsData } = await supabase
      .from('service_bookings')
      .select('status, total_amount')
      .eq('provider_id', id);

    const { data: provider } = await supabase
      .from('service_providers')
      .select('rating_average, total_bookings, total_earnings')
      .eq('id', id)
      .single();

    if (bookingsData && provider) {
      setStats({
        totalBookings: provider.total_bookings || 0,
        completedBookings: bookingsData.filter(b => b.status === 'completed').length,
        totalEarnings: provider.total_earnings || 0,
        averageRating: provider.rating_average || 0,
        pendingBookings: bookingsData.filter(b => b.status === 'pending').length
      });
    }
  };

  const fetchBookings = async (id: string) => {
    const { data, error } = await supabase
      .from('service_bookings')
      .select(`
        id,
        status,
        scheduled_date,
        scheduled_time,
        total_amount,
        service_address,
        customer_id,
        category_id
      `)
      .eq('provider_id', id)
      .order('scheduled_date', { ascending: true })
      .limit(20);

    if (error) {
      toast.error('Failed to fetch bookings');
      return;
    }

    const bookingsWithDetails = await Promise.all((data || []).map(async (b) => {
      const { data: customer } = await supabase
        .from('profiles')
        .select('username, phone_number, avatar_url')
        .eq('id', b.customer_id)
        .single();

      const { data: category } = await supabase
        .from('service_categories')
        .select('name')
        .eq('id', b.category_id)
        .single();

      return {
        ...b,
        customer: {
          username: customer?.username || 'Unknown',
          phone_number: customer?.phone_number || '',
          avatar_url: customer?.avatar_url || ''
        },
        category: {
          name: category?.name || 'Service'
        }
      };
    }));

    setBookings(bookingsWithDetails);
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase
      .from('service_bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) {
      toast.error('Failed to update booking');
      return;
    }

    toast.success(`Booking ${status}`);
    fetchBookings(providerId);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500/10 text-yellow-500',
      confirmed: 'bg-blue-500/10 text-blue-500',
      on_the_way: 'bg-purple-500/10 text-purple-500',
      in_progress: 'bg-orange-500/10 text-orange-500',
      completed: 'bg-green-500/10 text-green-500',
      cancelled: 'bg-red-500/10 text-red-500'
    };
    return colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-gradient-glass backdrop-blur-glass border-b border-glass-border">
        <div className="max-w-6xl mx-auto p-4">
          <h1 className="text-2xl font-bold text-foreground">Provider Dashboard</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalEarnings.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingBookings}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings List */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4 mt-4">
            {bookings.filter(b => b.status === 'pending').map(booking => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {booking.customer.avatar_url ? (
                          <img src={booking.customer.avatar_url} alt={booking.customer.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-primary">{booking.customer.username.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{booking.customer.username}</CardTitle>
                        <CardDescription>{booking.category.name}</CardDescription>
                      </div>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date & Time</span>
                      <span className="font-medium">
                        {new Date(booking.scheduled_date).toLocaleDateString()} at {booking.scheduled_time}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-medium text-right max-w-xs">{booking.service_address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-bold text-primary">₹{booking.total_amount}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 gap-2" 
                      onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Accept
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2"
                      onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button size="icon" variant="outline">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="active" className="space-y-4 mt-4">
            {bookings.filter(b => ['confirmed', 'on_the_way', 'in_progress'].includes(b.status)).map(booking => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {booking.customer.avatar_url ? (
                          <img src={booking.customer.avatar_url} alt={booking.customer.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-primary">{booking.customer.username.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{booking.customer.username}</CardTitle>
                        <CardDescription>{booking.category.name}</CardDescription>
                      </div>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-bold text-primary">₹{booking.total_amount}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {booking.status === 'confirmed' && (
                      <Button className="flex-1" onClick={() => updateBookingStatus(booking.id, 'on_the_way')}>
                        Start Journey
                      </Button>
                    )}
                    {booking.status === 'on_the_way' && (
                      <Button className="flex-1" onClick={() => updateBookingStatus(booking.id, 'in_progress')}>
                        Start Work
                      </Button>
                    )}
                    {booking.status === 'in_progress' && (
                      <Button className="flex-1" onClick={() => updateBookingStatus(booking.id, 'completed')}>
                        Complete Job
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {bookings.filter(b => b.status === 'completed').map(booking => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{booking.customer.username}</CardTitle>
                      <CardDescription>{booking.category.name}</CardDescription>
                    </div>
                    <span className="font-bold text-primary">₹{booking.total_amount}</span>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProviderDashboard;
