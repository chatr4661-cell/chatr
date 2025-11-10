import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle2,
  Calendar as CalendarIcon,
  User,
  MessageSquare,
  Share2,
  Heart,
  Verified,
  Info,
  TrendingUp,
  Award,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ChatrPlusServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    specialInstructions: ''
  });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fetch service details
  const { data: service, isLoading } = useQuery({
    queryKey: ['chatr-plus-service', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatr_plus_services')
        .select(`
          *,
          seller:chatr_plus_sellers(*),
          category:chatr_plus_categories(name, slug)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch reviews
  const { data: reviews } = useQuery({
    queryKey: ['chatr-plus-reviews', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatr_plus_reviews')
        .select(`
          *,
          user:profiles(username, avatar_url)
        `)
        .eq('service_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM'
  ];

  const calculateTotal = () => {
    if (!service?.price) return 0;
    const basePrice = service.price;
    const platformFee = Math.round(basePrice * 0.05); // 5% platform fee
    return basePrice + platformFee;
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time');
      return;
    }

    if (!bookingDetails.customerName || !bookingDetails.customerPhone) {
      toast.error('Please fill in your contact details');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please login to book');
        navigate('/auth');
        return;
      }

      const bookingDateTime = new Date(selectedDate);
      const [time, period] = selectedTime.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      bookingDateTime.setHours(hour, parseInt(minutes), 0);

      const platformFee = Math.round(service.price * 0.05);
      const totalAmount = service.price + platformFee;

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('chatr_plus_bookings')
        .insert({
          user_id: user.id,
          service_id: service.id,
          seller_id: service.seller_id,
          booking_date: bookingDateTime.toISOString(),
          customer_name: bookingDetails.customerName,
          customer_phone: bookingDetails.customerPhone,
          customer_address: bookingDetails.customerAddress,
          special_instructions: bookingDetails.specialInstructions,
          total_amount: totalAmount,
          platform_fee: platformFee,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Process payment
      const { error: paymentError } = await supabase.rpc('process_chatr_plus_payment', {
        p_user_id: user.id,
        p_amount: totalAmount,
        p_transaction_type: 'booking',
        p_payment_method: 'wallet',
        p_booking_id: booking.id,
        p_description: `Booking: ${service.service_name}`
      });

      if (paymentError) throw paymentError;

      toast.success('🎉 Booking confirmed!');
      setShowBookingDialog(false);
      navigate('/chatr-plus');
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Booking failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Service not found</h2>
          <Button onClick={() => navigate('/chatr-plus')}>Go Back</Button>
        </div>
      </div>
    );
  }

  const images = service.images && Array.isArray(service.images) && service.images.length > 0
    ? (service.images as string[])
    : service.image_url 
    ? [service.image_url]
    : [];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chatr-plus/search')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Heart className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="relative h-80 bg-muted">
          <img
            src={images[currentImageIndex]}
            alt={service.service_name}
            className="w-full h-full object-cover"
          />
          {images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full"
                onClick={() => setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full"
                onClick={() => setCurrentImageIndex((currentImageIndex + 1) % images.length)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentImageIndex ? "bg-white w-6" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            </>
          )}
          <Badge className="absolute top-4 right-4 bg-background/90">
            <ImageIcon className="w-3 h-3 mr-1" />
            {images.length}
          </Badge>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Service Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{service.service_name}</h1>
                {service.is_featured && (
                  <Badge className="bg-amber-500">Featured</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{service.rating_average || '4.5'}</span>
                  <span>({service.rating_count || 0} reviews)</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{service.booking_count || 0} bookings</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                ₹{service.price}
              </div>
              <div className="text-sm text-muted-foreground">
                {service.price_type === 'hourly' && 'per hour'}
                {service.price_type === 'starting_from' && 'starting from'}
              </div>
            </div>
          </div>

          {/* Service Info */}
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="gap-1">
              {service.category?.name}
            </Badge>
            {service.duration_minutes && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{service.duration_minutes} mins</span>
              </div>
            )}
            {service.service_area && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{service.service_area}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Description */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            About this service
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {service.description}
          </p>
          {service.tags && Array.isArray(service.tags) && service.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(service.tags as string[]).map((tag: string, index: number) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Seller Info */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Service Provider</h2>
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={service.seller?.logo_url} />
              <AvatarFallback>{service.seller?.business_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">{service.seller?.business_name}</h3>
                {service.seller?.is_verified && (
                  <Badge variant="secondary" className="gap-1">
                    <Verified className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{service.seller?.rating_average || '4.5'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  <span>{service.seller?.total_bookings || 0} completed</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{service.seller?.city}</span>
                </div>
              </div>
              {service.seller?.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {service.seller.description}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Phone className="w-4 h-4" />
                  Call
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Booking Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Select Date & Time
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Choose Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedDate && (
              <div>
                <label className="text-sm font-medium mb-2 block">Choose Time</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                      className="w-full"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                Reviews & Ratings
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                {reviews.length} reviews
              </span>
            </h2>
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start gap-3 mb-2">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={review.user?.avatar_url} />
                      <AvatarFallback>
                        {review.user?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{review.user?.username}</h4>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-4 h-4",
                                i < review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {review.review_text}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), "MMM dd, yyyy")}
                      </span>
                      {review.is_verified && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Book Now Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold text-primary">
                ₹{calculateTotal()}
              </div>
              <div className="text-xs text-muted-foreground">
                Includes ₹{Math.round((service.price || 0) * 0.05)} platform fee
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => setShowBookingDialog(true)}
              disabled={!selectedDate || !selectedTime}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              Book Now
            </Button>
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              Please provide your details to complete the booking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{service.service_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {selectedDate && format(selectedDate, "PPP")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary">₹{calculateTotal()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Your Name</label>
                <Input
                  placeholder="Full name"
                  value={bookingDetails.customerName}
                  onChange={(e) => setBookingDetails({
                    ...bookingDetails,
                    customerName: e.target.value
                  })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number</label>
                <Input
                  placeholder="10-digit mobile number"
                  value={bookingDetails.customerPhone}
                  onChange={(e) => setBookingDetails({
                    ...bookingDetails,
                    customerPhone: e.target.value
                  })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Address</label>
                <Textarea
                  placeholder="Complete address for service"
                  value={bookingDetails.customerAddress}
                  onChange={(e) => setBookingDetails({
                    ...bookingDetails,
                    customerAddress: e.target.value
                  })}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Special Instructions (Optional)
                </label>
                <Textarea
                  placeholder="Any specific requirements..."
                  value={bookingDetails.specialInstructions}
                  onChange={(e) => setBookingDetails({
                    ...bookingDetails,
                    specialInstructions: e.target.value
                  })}
                  rows={2}
                />
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleBooking}
            >
              Confirm & Pay ₹{calculateTotal()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
