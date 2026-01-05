import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, MapPin, Phone, Clock, CheckCircle2, 
  Circle, AlertCircle, Navigation, Star, MessageCircle
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
  special_instructions: string;
  status: string;
  total_amount: number;
  accepted_at: string | null;
  reached_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  payment_status: string | null;
  created_at: string;
}

interface StatusUpdate {
  id: string;
  status: string;
  notes: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Booking Placed', icon: Circle },
  { key: 'accepted', label: 'Provider Accepted', icon: CheckCircle2 },
  { key: 'en_route', label: 'On the Way', icon: Navigation },
  { key: 'arrived', label: 'Provider Arrived', icon: MapPin },
  { key: 'in_progress', label: 'Work in Progress', icon: Clock },
  { key: 'completed', label: 'Completed', icon: Star },
];

const getStatusIndex = (status: string) => {
  const index = STATUS_STEPS.findIndex(s => s.key === status);
  return index >= 0 ? index : 0;
};

export default function ServiceTracking() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking();
    fetchStatusUpdates();

    // Real-time subscription for booking updates
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_bookings',
          filter: `id=eq.${bookingId}`
        },
        (payload) => {
          setBooking(payload.new as Booking);
          toast.info(`Status updated: ${payload.new.status}`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_status_updates',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          setStatusUpdates(prev => [payload.new as StatusUpdate, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_status_updates')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStatusUpdates(data || []);
    } catch (error) {
      console.error('Error fetching status updates:', error);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    try {
      const { error } = await supabase
        .from('service_bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancelled by customer'
        })
        .eq('id', bookingId);

      if (error) throw error;
      toast.success('Booking cancelled');
      navigate('/services/history');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p className="text-muted-foreground">Booking not found</p>
      </div>
    );
  }

  const currentStep = getStatusIndex(booking.status);
  const isCancelled = booking.status === 'cancelled';
  const isCompleted = booking.status === 'completed';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-primary-foreground mb-2"
          onClick={() => navigate('/services/history')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Track Service</h1>
            <p className="text-sm opacity-80">#{booking.booking_number || booking.id.slice(0, 8)}</p>
          </div>
          <Badge 
            variant={isCancelled ? "destructive" : isCompleted ? "secondary" : "default"}
            className="capitalize"
          >
            {booking.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {isCancelled ? (
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-6 w-6" />
                <div>
                  <p className="font-medium">Booking Cancelled</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.cancellation_reason || 'No reason provided'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {STATUS_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index <= currentStep;
                  const isCurrent = index === currentStep;
                  
                  return (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          ${isActive 
                            ? isCurrent 
                              ? 'bg-primary text-primary-foreground animate-pulse' 
                              : 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                          }
                        `}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {index < STATUS_STEPS.length - 1 && (
                          <div className={`w-0.5 h-8 ${
                            index < currentStep ? 'bg-primary' : 'bg-muted'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`font-medium ${
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {step.label}
                        </p>
                        {isCurrent && booking.status === step.key && (
                          <p className="text-xs text-primary mt-1">Current status</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Scheduled</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(booking.scheduled_date), 'PPP')} at {booking.scheduled_time}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">{booking.service_address}</p>
              </div>
            </div>

            {booking.contact_phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Contact</p>
                  <p className="text-sm text-muted-foreground">{booking.contact_phone}</p>
                </div>
              </div>
            )}

            {booking.special_instructions && (
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Instructions</p>
                  <p className="text-sm text-muted-foreground">{booking.special_instructions}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Updates */}
        {statusUpdates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusUpdates.slice(0, 5).map((update) => (
                  <div key={update.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">
                        {update.status.replace('_', ' ')}
                      </p>
                      {update.notes && (
                        <p className="text-xs text-muted-foreground">{update.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(update.created_at), 'PPp')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Amount</span>
              <span className="text-xl font-bold text-primary">₹{booking.total_amount}</span>
            </div>
            <Badge variant="outline" className="mt-2">
              {booking.payment_status || 'Payment on completion'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Actions */}
      {!isCancelled && !isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleCancelBooking}
          >
            Cancel Booking
          </Button>
          <Button className="flex-1">
            <Phone className="h-4 w-4 mr-2" />
            Call Provider
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <Button className="w-full" onClick={() => navigate(`/services/review/${bookingId}`)}>
            <Star className="h-4 w-4 mr-2" />
            Rate & Review
          </Button>
        </div>
      )}
    </div>
  );
}
