import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Search, Star, MapPin, Calendar, Clock, IndianRupee, Phone, Video, MessageCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Service {
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
}

interface Provider {
  id: string;
  business_name: string;
  description: string | null;
  address: string | null;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  specializations?: Array<{ name: string }>;
  services?: Service[];
}

const BookingPage = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProviders();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('Appointment changed:', payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProviders = async () => {
    const { data, error } = await supabase
      .from('service_providers')
      .select(`
        *,
        provider_specializations!inner (
          specializations (
            name
          )
        )
      `)
      .eq('is_verified', true)
      .order('rating', { ascending: false });

    if (error) {
      console.error('Error loading providers:', error);
      return;
    }

    const formattedData = data?.map(provider => ({
      ...provider,
      specializations: provider.provider_specializations.map((ps: any) => ps.specializations)
    })) || [];

    setProviders(formattedData);
  };

  const handleBooking = async () => {
    if (!selectedProvider || !bookingDate || !bookingTime) {
      toast({
        title: 'Missing Information',
        description: 'Please select date and time for your appointment',
        variant: 'destructive',
      });
      return;
    }

    setIsBooking(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to book an appointment',
        variant: 'destructive',
      });
      setIsBooking(false);
      return;
    }

    try {
      const appointmentDateTime = new Date(`${bookingDate}T${bookingTime}`);

      // Get first service price for points (1 point = 1 INR)
      const servicePrice = selectedProvider.services?.[0]?.price || 300;
      const cashback = 25;

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          provider_id: selectedProvider.id,
          appointment_date: appointmentDateTime.toISOString(),
          notes: notes || null,
          status: 'pending',
          payment_method: 'points',
          points_used: servicePrice
        })
        .select()
        .single();

      if (error) throw error;

      // Process points payment
      const { data: userPoints } = await supabase
        .from('user_points')
        .select('balance, lifetime_spent')
        .eq('user_id', user.id)
        .single();

      if (userPoints && userPoints.balance >= servicePrice) {
        // Deduct points and add cashback
        await supabase
          .from('user_points')
          .update({
            balance: userPoints.balance - servicePrice + cashback,
            lifetime_spent: userPoints.lifetime_spent + servicePrice
          })
          .eq('user_id', user.id);

        // Create transaction records
        await supabase.from('point_transactions').insert([
          {
            user_id: user.id,
            amount: -servicePrice,
            transaction_type: 'spend',
            source: 'appointment_booking',
            description: `Appointment with ${selectedProvider.business_name}`
          },
          {
            user_id: user.id,
            amount: cashback,
            transaction_type: 'earn',
            source: 'appointment_booking',
            description: 'Appointment cashback reward'
          }
        ]);

        toast({
          title: 'Appointment Booked!',
          description: `Paid ${servicePrice} points, earned ${cashback} points cashback!`,
        });
      } else {
        toast({
          title: 'Success!',
          description: 'Appointment booked (insufficient points for payment)',
        });
      }

      setShowBookingDialog(false);
      setSelectedProvider(null);
      setBookingDate('');
      setBookingTime('');
      setNotes('');
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: 'Booking Failed',
        description: 'Unable to book appointment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBooking(false);
    }
  };

  const filteredProviders = providers.filter(provider =>
    provider.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* Compact Header */}
      <div className="px-3 py-2 backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-semibold">Book Appointment</h1>
            <p className="text-[10px] text-muted-foreground">Find & book healthcare providers</p>
          </div>
        </div>

        {/* Compact Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctors, nurses, specialists..."
            className="pl-8 h-8 text-xs rounded-full bg-muted/50 border-border/50"
          />
        </div>
      </div>

      {/* Providers List */}
      <ScrollArea className="flex-1 px-3 pb-20">
        <div className="grid gap-2 py-2">
          {filteredProviders.map((provider) => (
            <Card
              key={provider.id}
              className="p-2.5 hover:shadow-lg transition-all cursor-pointer border-border/30 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl"
              onClick={() => {
                setSelectedProvider(provider);
                setShowBookingDialog(true);
              }}
            >
              <div className="flex gap-2.5">
                <Avatar className="h-14 w-14 ring-2 ring-border/20 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-sm">
                    {provider.business_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-[11px] truncate">{provider.business_name}</h3>
                        {provider.is_verified && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">✓</Badge>
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{provider.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="flex items-center gap-0.5 text-[10px]">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{provider.rating}</span>
                      <span className="text-muted-foreground">({provider.total_reviews})</span>
                    </div>
                    {provider.address && (
                      <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[120px]">{provider.address.split(',')[0]}</span>
                      </div>
                    )}
                  </div>

                  {provider.services && provider.services.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 text-primary">
                      <IndianRupee className="h-3 w-3" />
                      <span className="text-[10px] font-semibold">{provider.services[0].price}</span>
                      <span className="text-[9px] text-muted-foreground">• {provider.services[0].duration_minutes}min</span>
                    </div>
                  )}

                  <div className="flex gap-1.5 mt-2">
                    <Button size="sm" className="h-6 text-[9px] rounded-full px-2.5 shadow-sm flex-1">
                      <Calendar className="h-2.5 w-2.5 mr-1" />
                      Book
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0 rounded-full">
                      <Phone className="h-2.5 w-2.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0 rounded-full">
                      <Video className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredProviders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[11px] text-muted-foreground">No providers found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-[340px] rounded-3xl bg-background/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-sm">Book Appointment</DialogTitle>
            <DialogDescription className="text-[10px]">
              Schedule with {selectedProvider?.business_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selectedProvider && (
              <Card className="p-2 bg-muted/30 border-border/30">
                <div className="flex gap-2">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs">
                      {selectedProvider.business_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[11px] truncate">{selectedProvider.business_name}</h4>
                    <p className="text-[9px] text-muted-foreground truncate">{selectedProvider.address}</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-[9px] font-medium">{selectedProvider.rating}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {selectedProvider?.services && selectedProvider.services.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium">Select Service</label>
                <div className="space-y-1">
                  {selectedProvider.services.map((service, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
                      <div className="flex-1">
                        <p className="text-[10px] font-medium">{service.name}</p>
                        <p className="text-[8px] text-muted-foreground">{service.duration_minutes} minutes</p>
                      </div>
                      <div className="flex items-center gap-0.5 text-primary">
                        <IndianRupee className="h-3 w-3" />
                        <span className="text-[10px] font-semibold">{service.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium">Date</label>
                <Input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-8 text-[10px] rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium">Time</label>
                <Input
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="h-8 text-[10px] rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium">Consultation Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-[9px] rounded-lg">
                  <Phone className="h-3 w-3 mr-1" />
                  Phone Call
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[9px] rounded-lg">
                  <Video className="h-3 w-3 mr-1" />
                  Video Call
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe your symptoms..."
                className="text-[10px] rounded-lg min-h-[60px]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowBookingDialog(false)}
                className="flex-1 h-8 text-[10px] rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBooking}
                disabled={isBooking || !bookingDate || !bookingTime}
                className="flex-1 h-8 text-[10px] rounded-full shadow-glow"
              >
                {isBooking ? 'Booking...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingPage;
