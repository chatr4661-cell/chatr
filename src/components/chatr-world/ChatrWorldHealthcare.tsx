import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Phone, Clock, Calendar, Heart, Stethoscope, Eye, Loader2, CheckCircle, Shield, Video, MessageCircle, ChevronRight, Sparkles, Award, Users, ThumbsUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const specialties = [
  { name: 'General Physician', icon: Stethoscope, color: 'from-blue-500 to-cyan-500' },
  { name: 'Dentist', icon: Heart, color: 'from-pink-500 to-rose-500' },
  { name: 'Dermatologist', icon: Sparkles, color: 'from-purple-500 to-violet-500' },
  { name: 'Gynecologist', icon: Heart, color: 'from-red-500 to-pink-500' },
  { name: 'Pediatrician', icon: Users, color: 'from-green-500 to-emerald-500' },
  { name: 'Orthopedic', icon: Shield, color: 'from-orange-500 to-amber-500' },
  { name: 'ENT Specialist', icon: Eye, color: 'from-teal-500 to-cyan-500' },
  { name: 'Cardiologist', icon: Heart, color: 'from-red-600 to-rose-600' },
];

export function ChatrWorldHealthcare({ location }: ChatrWorldHealthcareProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [consultationType, setConsultationType] = useState<'all' | 'video' | 'clinic'>('all');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [selectedSpecialty]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chatr_healthcare')
        .select('*')
        .eq('is_active', true)
        .order('rating_average', { ascending: false });

      if (selectedSpecialty !== 'All') {
        query = query.eq('specialty', selectedSpecialty);
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
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMDUiIHN0cm9rZS13aWR0aD0iMiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Find Expert Doctors</h2>
          <p className="text-white/80 text-sm mb-4">Book appointments with verified doctors near you</p>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <span>Verified Doctors</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <Video className="h-4 w-4" />
              </div>
              <span>Video Consult</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <span>Instant Booking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search doctors, specialties, clinics..."
          className="pl-12 h-14 text-lg rounded-xl border-2 focus:border-primary"
        />
      </div>

      {/* Specialties Grid */}
      <div>
        <h3 className="font-semibold mb-3">Browse by Specialty</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {specialties.map((spec) => (
            <button
              key={spec.name}
              onClick={() => setSelectedSpecialty(spec.name)}
              className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                selectedSpecialty === spec.name 
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                  : 'bg-card hover:bg-accent border'
              }`}
            >
              <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${spec.color} flex items-center justify-center mb-2`}>
                <spec.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs text-center line-clamp-2">{spec.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Consultation Type Tabs */}
      <Tabs value={consultationType} onValueChange={(v) => setConsultationType(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Doctors</TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="h-4 w-4" /> Video Consult
          </TabsTrigger>
          <TabsTrigger value="clinic" className="gap-2">
            <MapPin className="h-4 w-4" /> Clinic Visit
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Location Badge */}
      {location?.city && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          Showing doctors in <strong className="text-foreground">{location.city}</strong>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Doctors List */}
      {!loading && (
        <div className="space-y-4">
          {filteredProviders.map(provider => (
            <Card key={provider.id} className="overflow-hidden hover:shadow-xl transition-all border-0 shadow-md">
              <CardContent className="p-0">
                <div className="flex gap-4 p-4">
                  {/* Doctor Avatar */}
                  <div className="relative">
                    <Avatar className="h-24 w-24 rounded-xl">
                      <AvatarImage src={provider.image_url} alt={provider.name} />
                      <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xl">
                        {provider.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {provider.is_verified && (
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Doctor Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-lg">{provider.name}</h3>
                        <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                        <p className="text-xs text-muted-foreground mt-1">{provider.description}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 bg-green-100 text-green-700">
                        <Star className="h-3 w-3 fill-current mr-1" />
                        {provider.rating_average?.toFixed(1) || '4.5'}
                      </Badge>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Award className="h-4 w-4 text-blue-500" />
                        <span>12+ yrs exp</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                        <span>{provider.rating_count || 100}+ patients</span>
                      </div>
                    </div>

                    {/* Location */}
                    {provider.address && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                        <MapPin className="h-3 w-3" />
                        {provider.address}, {provider.city}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between bg-muted/50 px-4 py-3 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Consultation Fee: </span>
                    <span className="font-bold text-lg text-green-600">₹{provider.consultation_fee || 500}</span>
                  </div>
                  <div className="flex gap-2">
                    {provider.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${provider.phone}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Video className="h-4 w-4 mr-1" />
                      Video
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setSelectedProvider(provider)}>
                          <Calendar className="h-4 w-4 mr-1" />
                          Book Now
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Book Appointment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Doctor Card in Dialog */}
                          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={provider.image_url} />
                              <AvatarFallback>{provider.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{provider.name}</p>
                              <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                            </div>
                          </div>

                          {/* Appointment Type */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" className="h-20 flex-col gap-2">
                              <Video className="h-6 w-6 text-blue-500" />
                              <span className="text-xs">Video Consult</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2 border-primary bg-primary/5">
                              <MapPin className="h-6 w-6 text-green-500" />
                              <span className="text-xs">Clinic Visit</span>
                            </Button>
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
                              <Select value={bookingTime} onValueChange={setBookingTime}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'].map(time => (
                                    <SelectItem key={time} value={time}>{time}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Reason for visit (optional)</Label>
                            <Textarea
                              value={bookingReason}
                              onChange={(e) => setBookingReason(e.target.value)}
                              placeholder="Describe your symptoms..."
                              rows={3}
                            />
                          </div>

                          {/* Fee Summary */}
                          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Consultation Fee</span>
                              <span>₹{provider.consultation_fee || 500}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Chatr Discount</span>
                              <span>-₹50</span>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-2 mt-2">
                              <span>Total</span>
                              <span className="text-green-600">₹{(provider.consultation_fee || 500) - 50}</span>
                            </div>
                          </div>

                          <Button 
                            onClick={handleBookAppointment}
                            disabled={booking || !bookingDate || !bookingTime}
                            className="w-full h-12 text-lg"
                          >
                            {booking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Confirm Booking
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-4">
            <Stethoscope className="h-12 w-12 text-blue-500" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No doctors found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
