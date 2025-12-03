import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Phone, Clock, Calendar, Heart, Stethoscope, Eye, Loader2, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Provider {
  id: string;
  name: string;
  provider_type: string;
  specialty: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  image_url: string;
  rating_average: number;
  rating_count: number;
  consultation_fee: number;
  is_verified: boolean;
  available_days: string[];
  opening_time: string;
  closing_time: string;
}

interface ChatrWorldHealthcareProps {
  location?: { lat: number; lon: number; city?: string } | null;
}

const providerTypes = ['All', 'doctor', 'clinic', 'hospital', 'lab', 'pharmacy'];
const specialties = ['All', 'General', 'Dental', 'Eye', 'Cardiology', 'Dermatology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'ENT'];

export function ChatrWorldHealthcare({ location }: ChatrWorldHealthcareProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerType, setProviderType] = useState('All');
  const [specialty, setSpecialty] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [providerType, specialty]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chatr_healthcare')
        .select('*')
        .eq('is_active', true)
        .order('rating_average', { ascending: false });

      if (providerType !== 'All') {
        query = query.eq('provider_type', providerType);
      }
      if (specialty !== 'All') {
        query = query.eq('specialty', specialty);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load healthcare providers');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedProvider || !bookingDate || !bookingTime) {
      toast.error('Please select date and time');
      return;
    }

    setBooking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to book appointment');
        return;
      }

      const { error } = await supabase
        .from('chatr_healthcare_appointments')
        .insert({
          provider_id: selectedProvider.id,
          user_id: user.id,
          appointment_date: bookingDate,
          appointment_time: bookingTime,
          reason: bookingReason,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Appointment booked successfully!');
      setSelectedProvider(null);
      setBookingDate('');
      setBookingTime('');
      setBookingReason('');
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const filteredProviders = providers.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'doctor': return <Stethoscope className="h-5 w-5" />;
      case 'hospital': return <Heart className="h-5 w-5" />;
      case 'eye': return <Eye className="h-5 w-5" />;
      default: return <Heart className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctors, clinics, hospitals..."
            className="pl-10"
          />
        </div>
        <Select value={providerType} onValueChange={setProviderType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {providerTypes.map(type => (
              <SelectItem key={type} value={type}>{type === 'All' ? 'All Types' : type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Specialty" />
          </SelectTrigger>
          <SelectContent>
            {specialties.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Providers Grid */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map(provider => (
            <Card key={provider.id} className="hover:shadow-lg transition-all overflow-hidden">
              {provider.image_url && (
                <div className="h-40 bg-gradient-to-br from-red-100 to-pink-100 relative">
                  <img 
                    src={provider.image_url} 
                    alt={provider.name}
                    className="w-full h-full object-cover"
                  />
                  {provider.is_verified && (
                    <Badge className="absolute top-2 right-2 bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  )}
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {provider.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{provider.provider_type}</Badge>
                      {provider.specialty && (
                        <Badge variant="outline">{provider.specialty}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{provider.rating_average?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">({provider.rating_count || 0} reviews)</span>
                </div>

                {/* Location */}
                {provider.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {provider.address}, {provider.city}
                  </p>
                )}

                {/* Fee */}
                {provider.consultation_fee && (
                  <p className="text-green-600 font-medium">
                    ₹{provider.consultation_fee} consultation
                  </p>
                )}

                {/* Timing */}
                {provider.opening_time && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {provider.opening_time} - {provider.closing_time}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {provider.phone && (
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={`tel:${provider.phone}`}>
                        <Phone className="h-4 w-4 mr-1" /> Call
                      </a>
                    </Button>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex-1" onClick={() => setSelectedProvider(provider)}>
                        <Calendar className="h-4 w-4 mr-1" /> Book
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Book Appointment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div>
                            <Label>Time</Label>
                            <Input
                              type="time"
                              value={bookingTime}
                              onChange={(e) => setBookingTime(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Reason for visit</Label>
                          <Textarea
                            value={bookingReason}
                            onChange={(e) => setBookingReason(e.target.value)}
                            placeholder="Describe your symptoms or reason..."
                          />
                        </div>
                        <Button 
                          onClick={handleBookAppointment}
                          disabled={booking}
                          className="w-full"
                        >
                          {booking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Confirm Booking
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No healthcare providers found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}