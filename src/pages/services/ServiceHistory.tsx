import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, Calendar, MapPin, Clock, ChevronRight,
  RefreshCw, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Booking {
  id: string;
  booking_number: string;
  scheduled_date: string;
  scheduled_time: string;
  service_address: string;
  status: string;
  total_amount: number;
  created_at: string;
  provider_id: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    default: return 'bg-muted text-muted-foreground';
  }
};

export default function ServiceHistory() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('service_bookings')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load booking history');
    } finally {
      setLoading(false);
    }
  };

  const activeBookings = bookings.filter(b => 
    !['completed', 'cancelled'].includes(b.status)
  );
  const pastBookings = bookings.filter(b => 
    ['completed', 'cancelled'].includes(b.status)
  );

  const handleRebook = (booking: Booking) => {
    navigate(`/services/provider/${booking.provider_id}`);
  };

  const renderBookingCard = (booking: Booking, showRebook = false) => (
    <Card 
      key={booking.id}
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/services/tracking/${booking.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                #{booking.booking_number || booking.id.slice(0, 8)}
              </span>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(booking.scheduled_date), 'PPP')}
            </div>
            
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {booking.scheduled_time}
            </div>
            
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{booking.service_address}</span>
            </div>
          </div>
          
          <div className="text-right">
            <p className="font-bold text-primary">₹{booking.total_amount}</p>
            <ChevronRight className="h-5 w-5 text-muted-foreground mt-2 ml-auto" />
          </div>
        </div>
        
        {showRebook && booking.status === 'completed' && (
          <div className="flex gap-2 mt-4 pt-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/services/review/${booking.id}`);
              }}
            >
              <Star className="h-4 w-4 mr-1" />
              Rate
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleRebook(booking);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Rebook
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-primary-foreground mb-2"
          onClick={() => navigate('/local-deals')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">My Bookings</h1>
        <p className="text-sm opacity-80">{bookings.length} total bookings</p>
      </div>

      {/* Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active ({activeBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : activeBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No active bookings</p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate('/local-deals')}
                >
                  Book a Service
                </Button>
              </Card>
            ) : (
              activeBookings.map(booking => renderBookingCard(booking))
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : pastBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No past bookings</p>
              </Card>
            ) : (
              pastBookings.map(booking => renderBookingCard(booking, true))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
