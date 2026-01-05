import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, Bell, Calendar, DollarSign, Clock, 
  CheckCircle, XCircle, MapPin, Star, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Booking {
  id: string;
  booking_number: string;
  scheduled_date: string;
  scheduled_time: string;
  service_address: string;
  contact_phone: string;
  status: string;
  total_amount: number;
  provider_earnings: number;
  special_instructions: string;
  customer_id: string;
  created_at: string;
}

interface ProviderStats {
  totalEarnings: number;
  completedJobs: number;
  pendingBookings: number;
  averageRating: number;
}

export default function ServiceProviderDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<ProviderStats>({
    totalEarnings: 0,
    completedJobs: 0,
    pendingBookings: 0,
    averageRating: 0
  });
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    checkProvider();
  }, []);

  const checkProvider = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is a service provider
      const { data: provider, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !provider) {
        toast.error('You are not registered as a service provider');
        navigate('/vendor/register');
        return;
      }

      setProviderId(provider.id);
      setIsOnline(provider.is_online || false);
      fetchBookings(provider.id);
      calculateStats(provider);
    } catch (error) {
      console.error('Error checking provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async (provId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .select('*')
        .eq('provider_id', provId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);

      // Subscribe to real-time updates
      const channel = supabase
        .channel('provider-bookings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'service_bookings',
            filter: `provider_id=eq.${provId}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setBookings(prev => [payload.new as Booking, ...prev]);
              toast.info('New booking received!');
            } else if (payload.eventType === 'UPDATE') {
              setBookings(prev => prev.map(b => 
                b.id === payload.new.id ? payload.new as Booking : b
              ));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const calculateStats = (provider: any) => {
    setStats({
      totalEarnings: provider.total_earnings || 0,
      completedJobs: provider.total_bookings || 0,
      pendingBookings: 0,
      averageRating: provider.rating_average || 0
    });
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'accepted') updateData.accepted_at = new Date().toISOString();
      if (newStatus === 'en_route') updateData.reached_at = null;
      if (newStatus === 'arrived') updateData.reached_at = new Date().toISOString();
      if (newStatus === 'in_progress') updateData.started_at = new Date().toISOString();
      if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from('service_bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) throw error;

      // Add status update record
      await supabase.from('booking_status_updates').insert({
        booking_id: bookingId,
        status: newStatus,
        updated_by: providerId
      });

      // Get booking to send notification to customer
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        await supabase.functions.invoke('send-service-notification', {
          body: {
            type: `booking_${newStatus}`,
            bookingId: bookingId,
            customerId: booking.customer_id,
            status: newStatus
          }
        });
      }

      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleOnlineToggle = async (online: boolean) => {
    try {
      const { error } = await supabase
        .from('service_providers')
        .update({ is_online: online })
        .eq('id', providerId);

      if (error) throw error;
      setIsOnline(online);
      toast.success(online ? 'You are now online' : 'You are now offline');
    } catch (error) {
      console.error('Error toggling online status:', error);
    }
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const activeBookings = bookings.filter(b => 
    ['accepted', 'en_route', 'arrived', 'in_progress'].includes(b.status)
  );
  const completedBookings = bookings.filter(b => 
    ['completed', 'cancelled'].includes(b.status)
  );

  const getNextAction = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Accept', next: 'accepted' };
      case 'accepted': return { label: 'On My Way', next: 'en_route' };
      case 'en_route': return { label: 'Arrived', next: 'arrived' };
      case 'arrived': return { label: 'Start Work', next: 'in_progress' };
      case 'in_progress': return { label: 'Complete', next: 'completed' };
      default: return null;
    }
  };

  const renderBookingCard = (booking: Booking) => {
    const action = getNextAction(booking.status);
    
    return (
      <Card key={booking.id} className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-medium">#{booking.booking_number || booking.id.slice(0, 8)}</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {booking.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="font-bold text-primary">₹{booking.provider_earnings || booking.total_amount}</p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(new Date(booking.scheduled_date), 'PPP')} at {booking.scheduled_time}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="line-clamp-1">{booking.service_address}</span>
            </div>
            {booking.special_instructions && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Note: {booking.special_instructions}
              </p>
            )}
          </div>

          {action && booking.status !== 'completed' && booking.status !== 'cancelled' && (
            <div className="flex gap-2 mt-4 pt-3 border-t">
              {booking.status === 'pending' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              )}
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => handleStatusUpdate(booking.id, action.next)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {action.label}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground relative"
              onClick={() => navigate('/vendor/notifications')}
            >
              <Bell className="h-5 w-5" />
              {pendingBookings.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {pendingBookings.length}
                </span>
              )}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
              <Switch 
                checked={isOnline}
                onCheckedChange={handleOnlineToggle}
              />
            </div>
          </div>
        </div>
        <h1 className="text-xl font-bold">Provider Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-4 -mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Earnings</p>
                <p className="text-lg font-bold">₹{stats.totalEarnings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-bold">{stats.completedJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold">{pendingBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="text-lg font-bold">{stats.averageRating.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Tabs */}
      <div className="p-4">
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              New ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({activeBookings.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No pending bookings</p>
              </Card>
            ) : (
              pendingBookings.map(renderBookingCard)
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            {activeBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active bookings</p>
              </Card>
            ) : (
              activeBookings.map(renderBookingCard)
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No completed bookings yet</p>
              </Card>
            ) : (
              completedBookings.slice(0, 10).map(renderBookingCard)
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate('/vendor/earnings')}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Earnings
          </Button>
          <Button 
            className="flex-1"
            onClick={() => navigate('/vendor/services')}
          >
            Manage Services
          </Button>
        </div>
      </div>
    </div>
  );
}
