import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ArrowLeft, Star, Shield, Clock, MapPin, Phone, 
  Calendar as CalendarIcon, CheckCircle, TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Provider {
  id: string;
  business_name: string;
  description: string;
  hourly_rate: number;
  rating_average: number;
  rating_count: number;
  completed_jobs: number;
  verified: boolean;
  phone_number: string;
}

interface ProviderService {
  id: string;
  service_name: string;
  description: string;
  base_price: number;
  duration_minutes: number;
}

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

const getCompetitivePrice = (marketPrice: number) => Math.round(marketPrice * 0.85);

export default function ProviderDetail() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<ProviderService | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [instructions, setInstructions] = useState('');
  const [booking, setBooking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
    fetchProvider();
    fetchServices();
  }, [providerId]);

  const fetchProvider = async () => {
    try {
      const { data, error } = await supabase
        .from('home_service_providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (error) throw error;
      setProvider(data);
    } catch (error) {
      console.error('Error fetching provider:', error);
      toast.error('Failed to load provider details');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (error) throw error;
      setServices(data || []);
      if (data && data.length > 0) {
        setSelectedService(data[0]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleBooking = async () => {
    if (!userId) {
      toast.error('Please login to book a service');
      navigate('/auth');
      return;
    }

    if (!selectedService || !selectedDate || !selectedTime || !address) {
      toast.error('Please fill all required fields');
      return;
    }

    setBooking(true);
    try {
      const subtotal = getCompetitivePrice(selectedService.base_price);
      const commissionRate = 0.10; // 10% platform commission
      const commissionAmount = subtotal * commissionRate;
      const providerEarnings = subtotal - commissionAmount;

      const bookingData = {
        customer_id: userId,
        provider_id: providerId,
        service_id: selectedService.id,
        category_id: provider?.id, // Using provider id as category for now
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_time: selectedTime,
        service_address: address,
        contact_phone: phone,
        special_instructions: instructions,
        status: 'pending',
        subtotal: subtotal,
        total_amount: subtotal,
        commission_amount: commissionAmount,
        provider_earnings: providerEarnings,
        payment_method: 'cash',
        payment_status: 'pending',
        pricing_details: {
          market_price: selectedService.base_price,
          discount_percent: 15,
          chatr_price: subtotal
        }
      };

      const { data, error } = await supabase
        .from('service_bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;

      // Send push notification to provider
      await supabase.functions.invoke('send-service-notification', {
        body: {
          type: 'new_booking',
          bookingId: data.id,
          providerId: providerId,
          customerName: 'Customer',
          serviceName: selectedService.service_name,
          scheduledDate: format(selectedDate, 'PPP'),
          scheduledTime: selectedTime
        }
      });

      toast.success('Booking confirmed!');
      navigate(`/services/tracking/${data.id}`);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p className="text-muted-foreground">Provider not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
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
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{provider.business_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {provider.verified && (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{provider.rating_average} ({provider.rating_count})</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs">
              <TrendingDown className="h-3 w-3" />
              15% OFF
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Description */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{provider.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {provider.completed_jobs} jobs completed
              </div>
              {provider.phone_number && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {provider.phone_number}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {services.length === 0 ? (
              <div className="p-4 border rounded-lg">
                <p className="font-medium">Standard Service</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Hourly rate</span>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground line-through">
                      ₹{provider.hourly_rate}
                    </span>
                    <span className="ml-2 font-bold text-primary">
                      ₹{getCompetitivePrice(provider.hourly_rate)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-all",
                    selectedService?.id === service.id 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{service.service_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {service.description}
                      </p>
                      {service.duration_minutes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ~{service.duration_minutes} mins
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground line-through">
                        ₹{service.base_price}
                      </span>
                      <div className="font-bold text-primary">
                        ₹{getCompetitivePrice(service.base_price)}
                      </div>
                    </div>
                  </div>
                  {selectedService?.id === service.id && (
                    <CheckCircle className="h-5 w-5 text-primary absolute right-4 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Select Time Slot</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {TIME_SLOTS.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address & Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                placeholder="Enter your complete address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                placeholder="+91 XXXXX XXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="instructions">Special Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Any specific requirements..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Price Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Market Price</span>
              <span className="line-through text-muted-foreground">
                ₹{selectedService?.base_price || provider.hourly_rate}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-muted-foreground">CHATR Discount (15%)</span>
              <span className="text-green-600">
                -₹{Math.round((selectedService?.base_price || provider.hourly_rate) * 0.15)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="font-semibold">You Pay</span>
              <span className="text-xl font-bold text-primary">
                ₹{getCompetitivePrice(selectedService?.base_price || provider.hourly_rate)}
              </span>
            </div>
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              You save 15% compared to Urban Company!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleBooking}
          disabled={booking || !selectedDate || !selectedTime || !address}
        >
          {booking ? 'Booking...' : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
}
