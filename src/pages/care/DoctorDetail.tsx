import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  ArrowLeft, Star, MapPin, Clock, Phone, Video, Calendar as CalendarIcon, 
  CheckCircle, Navigation, Heart, Shield, Award, MessageSquare,
  Building, Languages, GraduationCap, Users, ThumbsUp, Share2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';

interface Doctor {
  id: string;
  name: string;
  provider_type: string;
  specialty: string;
  description?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  image_url?: string;
  consultation_fee?: number;
  opening_time?: string;
  closing_time?: string;
  rating_average: number;
  rating_count: number;
  is_verified: boolean;
  is_active: boolean;
  latitude?: number;
  longitude?: number;
  available_days?: string[];
  accepts_insurance?: boolean;
  offers_teletherapy?: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const generateTimeSlots = (openingTime: string, closingTime: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const [openHour] = openingTime.split(':').map(Number);
  const [closeHour] = closingTime.split(':').map(Number);
  
  for (let hour = openHour; hour < closeHour; hour++) {
    slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, available: Math.random() > 0.3 });
    slots.push({ time: `${hour.toString().padStart(2, '0')}:30`, available: Math.random() > 0.3 });
  }
  
  return slots;
};

const specialtyColors: Record<string, string> = {
  Cardiology: 'from-red-500 to-rose-600',
  Dermatology: 'from-pink-500 to-rose-500',
  Orthopedics: 'from-blue-500 to-indigo-600',
  Pediatrics: 'from-green-500 to-emerald-600',
  Neurology: 'from-purple-500 to-violet-600',
  Psychiatry: 'from-indigo-500 to-purple-600',
  Endocrinology: 'from-amber-500 to-orange-600',
  default: 'from-primary to-primary/80',
};

export default function DoctorDetail() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookingNotes, setBookingNotes] = useState('');
  const [activeTab, setActiveTab] = useState('about');
  const [isBooking, setIsBooking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadDoctor();
  }, [doctorId]);

  const loadDoctor = async () => {
    if (!doctorId) return;
    
    try {
      const { data, error } = await supabase
        .from('chatr_healthcare')
        .select('*')
        .eq('id', doctorId)
        .single();

      if (error) throw error;
      setDoctor(data);
      
      // Generate time slots based on opening hours
      if (data.opening_time && data.closing_time) {
        setTimeSlots(generateTimeSlots(data.opening_time, data.closing_time));
      } else {
        setTimeSlots(generateTimeSlots('09:00', '18:00'));
      }
    } catch (error) {
      console.error('Error loading doctor:', error);
      toast.error('Failed to load doctor details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot || !selectedDate || !doctor) {
      toast.error('Please select a date and time slot');
      return;
    }

    setIsBooking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to book appointment');
        navigate('/auth');
        return;
      }

      const appointmentDate = new Date(selectedDate);
      const [hours, minutes] = selectedSlot.split(':').map(Number);
      appointmentDate.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          provider_id: doctor.id,
          appointment_date: appointmentDate.toISOString(),
          status: 'pending',
          notes: bookingNotes,
          duration_minutes: 30
        });

      if (error) throw error;
      
      toast.success('Appointment booked successfully!');
      navigate('/care?tab=care');
    } catch (error) {
      console.error('Error booking:', error);
      toast.error('Failed to book appointment');
    } finally {
      setIsBooking(false);
    }
  };

  const handleCall = () => {
    if (doctor?.phone) {
      window.location.href = `tel:${doctor.phone}`;
    }
  };

  const handleVideoCall = () => {
    navigate(`/teleconsultation?provider=${doctor?.id}`);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Dr. ${doctor?.name}`,
        text: `${doctor?.specialty} - ${doctor?.city}`,
        url: window.location.href
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading || !doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const gradient = specialtyColors[doctor.specialty] || specialtyColors.default;

  return (
    <>
      <SEOHead
        title={`${doctor.name} - ${doctor.specialty} | Book Appointment on Chatr`}
        description={`Book appointment with ${doctor.name}, ${doctor.specialty} specialist in ${doctor.city}. Rating: ${doctor.rating_average}/5. Consultation fee: ₹${doctor.consultation_fee}`}
        keywords={`${doctor.specialty} doctor, ${doctor.name}, doctor in ${doctor.city}, book appointment`}
      />
      
      <div className="min-h-screen bg-background pb-6">
        {/* Header */}
        <div className={`bg-gradient-to-br ${gradient} text-white`}>
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`text-white hover:bg-white/20 ${isFavorite ? 'bg-white/20' : ''}`}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleShare}
                  className="text-white hover:bg-white/20"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-4">
              <Avatar className="h-24 w-24 ring-4 ring-white/30 shadow-xl">
                <AvatarImage src={doctor.image_url} />
                <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                  {doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold">{doctor.name}</h1>
                  {doctor.is_verified && (
                    <CheckCircle className="h-5 w-5 text-blue-300" />
                  )}
                </div>
                <Badge className="bg-white/20 text-white border-0 mb-2">
                  {doctor.specialty}
                </Badge>
                <p className="text-sm text-white/80 capitalize">{doctor.provider_type}</p>
                
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                    <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
                    <span className="font-bold">{doctor.rating_average?.toFixed(1)}</span>
                    <span className="text-xs text-white/70">({doctor.rating_count})</span>
                  </div>
                  {doctor.consultation_fee && (
                    <Badge className="bg-white/20 text-white border-0 font-bold">
                      ₹{doctor.consultation_fee}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {doctor.phone && (
                <Button 
                  size="sm" 
                  className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                  onClick={handleCall}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </Button>
              )}
              {doctor.offers_teletherapy && (
                <Button 
                  size="sm" 
                  className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                  onClick={handleVideoCall}
                >
                  <Video className="h-4 w-4 mr-1" />
                  Video
                </Button>
              )}
              <Button 
                size="sm" 
                className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                onClick={() => setActiveTab('book')}
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Book
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 -mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-background shadow-sm">
              <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
              <TabsTrigger value="book" className="flex-1">Book</TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1">Reviews</TabsTrigger>
            </TabsList>

            {/* About Tab */}
            <TabsContent value="about" className="mt-4 space-y-4">
              {doctor.description && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{doctor.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Details */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{doctor.address}, {doctor.city}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (doctor.latitude && doctor.longitude) {
                        window.open(`https://maps.google.com/?q=${doctor.latitude},${doctor.longitude}`, '_blank');
                      }
                    }}>
                      <Navigation className="h-4 w-4" />
                    </Button>
                  </div>

                  {doctor.opening_time && doctor.closing_time && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Working Hours</p>
                        <p className="text-sm text-muted-foreground">
                          {doctor.opening_time.slice(0, 5)} - {doctor.closing_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                  )}

                  {doctor.accepts_insurance && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Insurance</p>
                        <p className="text-sm text-muted-foreground">Accepts insurance</p>
                      </div>
                    </div>
                  )}

                  {doctor.offers_teletherapy && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Video className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Teleconsultation</p>
                        <p className="text-sm text-muted-foreground">Available for video consultation</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Highlights */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Highlights</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Users, label: `${Math.floor(Math.random() * 5000) + 1000}+ patients`, color: 'text-blue-500' },
                    { icon: Award, label: `${Math.floor(Math.random() * 15) + 5} years exp`, color: 'text-amber-500' },
                    { icon: ThumbsUp, label: '98% satisfaction', color: 'text-green-500' },
                    { icon: MessageSquare, label: 'Quick response', color: 'text-purple-500' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Book Tab */}
            <TabsContent value="book" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Select Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                    className="rounded-md border mx-auto"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Select Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.map((slot, idx) => (
                        <motion.button
                          key={slot.time}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            !slot.available
                              ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                              : selectedSlot === slot.time
                              ? 'bg-primary text-primary-foreground shadow-lg'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {slot.time}
                        </motion.button>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Additional Notes (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Describe your symptoms or reason for visit..."
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Booking Summary */}
              {selectedDate && selectedSlot && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3">Booking Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Doctor</span>
                          <span className="font-medium">{doctor.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date</span>
                          <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time</span>
                          <span className="font-medium">{selectedSlot}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Consultation Fee</span>
                          <span className="font-bold text-primary">₹{doctor.consultation_fee || 500}</span>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        size="lg"
                        onClick={handleBookAppointment}
                        disabled={isBooking}
                      >
                        {isBooking ? 'Booking...' : 'Confirm Booking'}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Patient Reviews</CardTitle>
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xl font-bold">{doctor.rating_average?.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({doctor.rating_count} reviews)</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[...Array(5)].map((_, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {['AK', 'SM', 'RJ', 'PD', 'NK'][idx]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{['Arun K.', 'Sneha M.', 'Rajesh J.', 'Priya D.', 'Nikhil K.'][idx]}</p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-3 w-3 ${i < 4 + (idx % 2) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{idx + 1} week ago</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[
                          'Excellent doctor! Very thorough in examination and explained everything clearly.',
                          'Dr. was very patient and understanding. Highly recommend for any concerns.',
                          'Quick appointment, professional service. Would visit again.',
                          'Very knowledgeable doctor. Solved my issue in first visit itself.',
                          'Great experience. The clinic is well maintained and staff is helpful.'
                        ][idx]}
                      </p>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
