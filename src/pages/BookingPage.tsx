import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, Star, MapPin, Calendar, Clock, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Provider {
  id: string;
  business_name: string;
  description: string | null;
  address: string | null;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  specializations?: Array<{ name: string }>;
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

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          provider_id: selectedProvider.id,
          appointment_date: appointmentDateTime.toISOString(),
          notes: notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your appointment has been booked successfully',
      });

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
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Header */}
      <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-gradient-glass">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Doctor & Nurse Booking</h1>
            <p className="text-sm text-muted-foreground">Find healthcare providers near you</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 bg-gradient-glass backdrop-blur-glass border-b border-glass-border">
        <div className="relative max-w-4xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctors, nurses, specialists..."
            className="pl-10 rounded-full bg-background/50 border-glass-border"
          />
        </div>
      </div>

      {/* Providers List */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid gap-4 max-w-4xl mx-auto">
          {filteredProviders.map((provider) => (
            <Card
              key={provider.id}
              className="p-4 hover:shadow-elevated transition-all cursor-pointer border-glass-border bg-gradient-card backdrop-blur-glass"
              onClick={() => {
                setSelectedProvider(provider);
                setShowBookingDialog(true);
              }}
            >
              <div className="flex gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xl">
                    {provider.business_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{provider.business_name}</h3>
                        {provider.is_verified && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{provider.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{provider.rating}</span>
                      <span className="text-muted-foreground">({provider.total_reviews})</span>
                    </div>
                    {provider.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{provider.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="rounded-full shadow-glow">
                      <Calendar className="h-3 w-3 mr-1" />
                      Book Appointment
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full">
                      <Clock className="h-3 w-3 mr-1" />
                      View Availability
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredProviders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No providers found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>
              Schedule your appointment with {selectedProvider?.business_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedProvider && (
              <Card className="p-3 bg-muted/50">
                <div className="flex gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                      {selectedProvider.business_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{selectedProvider.business_name}</h4>
                    <p className="text-xs text-muted-foreground">{selectedProvider.address}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">{selectedProvider.rating}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Appointment Date</label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Appointment Time</label>
              <Input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific concerns or requirements..."
                className="rounded-lg min-h-[80px]"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowBookingDialog(false)}
                className="flex-1 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBooking}
                disabled={isBooking || !bookingDate || !bookingTime}
                className="flex-1 rounded-lg shadow-glow"
              >
                {isBooking ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingPage;
