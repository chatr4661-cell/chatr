import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Phone, MessageSquare, Star, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface BookingDetails {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  total_amount: number;
  service_address: string;
  provider: {
    business_name: string;
    phone_number: string;
    profile_image_url: string;
  };
  category: {
    name: string;
  };
}

const BookingTracking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('booking-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_bookings',
          filter: `id=eq.${bookingId}`
        },
        (payload) => {
          setBooking(prev => prev ? { ...prev, status: payload.new.status } : null);
          toast.success(`Booking status updated to ${payload.new.status}`);
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
        .select(`
          id,
          status,
          scheduled_date,
          scheduled_time,
          total_amount,
          service_address,
          provider_id,
          category_id,
          customer_id
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      const { data: provider } = await supabase
        .from('service_providers')
        .select('business_name, phone_number, profile_image_url')
        .eq('id', data.provider_id)
        .single();

      const { data: category } = await supabase
        .from('service_categories')
        .select('name')
        .eq('id', data.category_id)
        .single();

      setBooking({
        ...data,
        provider: {
          business_name: provider?.business_name || '',
          phone_number: provider?.phone_number || '',
          profile_image_url: provider?.profile_image_url || ''
        },
        category: {
          name: category?.name || ''
        }
      });
    } catch (error) {
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
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

  const getStatusSteps = () => [
    { label: 'Confirmed', status: 'confirmed', icon: CheckCircle },
    { label: 'On The Way', status: 'on_the_way', icon: MapPin },
    { label: 'In Progress', status: 'in_progress', icon: Clock },
    { label: 'Completed', status: 'completed', icon: CheckCircle }
  ];

  const currentStatusIndex = getStatusSteps().findIndex(s => s.status === booking?.status);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!booking) {
    return <div className="min-h-screen flex items-center justify-center">Booking not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-gradient-glass backdrop-blur-glass border-b border-glass-border">
        <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Track Booking</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Booking Status</CardTitle>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Steps */}
            <div className="relative">
              <div className="flex justify-between mb-8">
                {getStatusSteps().map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index <= currentStatusIndex;
                  return (
                    <div key={step.status} className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-xs text-center mt-2 text-muted-foreground">{step.label}</div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${(currentStatusIndex / (getStatusSteps().length - 1)) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Provider Info */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {booking.provider.profile_image_url ? (
                  <img src={booking.provider.profile_image_url} alt={booking.provider.business_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">
                    {booking.provider.business_name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{booking.provider.business_name}</h3>
                <p className="text-sm text-muted-foreground">{booking.category.name}</p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={() => window.location.href = `tel:${booking.provider.phone_number}`}>
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date & Time</span>
              <span className="font-medium">
                {new Date(booking.scheduled_date).toLocaleDateString()} at {booking.scheduled_time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Address</span>
              <span className="font-medium text-right">{booking.service_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-bold text-primary text-lg">₹{booking.total_amount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {booking.status === 'completed' && (
          <Card>
            <CardContent className="pt-6">
              <Button className="w-full gap-2" size="lg">
                <Star className="h-4 w-4" />
                Rate Service
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BookingTracking;
