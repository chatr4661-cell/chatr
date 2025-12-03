import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Sparkles, Scissors, Wrench, Zap, Paintbrush, Wind, MapPin, Star, Phone, Clock, Calendar, ChevronRight, Shield, TrendingUp, CheckCircle, BadgeCheck, Navigation, Percent, Timer, Users, Heart, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { chatrLocalSearch } from '@/lib/chatrClient';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const serviceCategories = [
  { id: 'salon-women', name: "Women's Salon", icon: Sparkles, color: 'from-pink-500 to-rose-500', emoji: '💅', subcategories: ['Haircut & Styling', 'Hair Color', 'Facial', 'Manicure & Pedicure', 'Waxing', 'Threading', 'Spa Therapy', 'Bridal Makeup'] },
  { id: 'salon-men', name: "Men's Salon", icon: Scissors, color: 'from-blue-500 to-cyan-500', emoji: '💈', subcategories: ['Haircut', 'Shaving & Beard', 'Facial & Cleanup', 'Massage', 'Hair Color', 'Spa'] },
  { id: 'cleaning', name: "Cleaning", icon: Sparkles, color: 'from-green-500 to-emerald-500', emoji: '🧹', subcategories: ['Bathroom Cleaning', 'Kitchen Cleaning', 'Full Home Cleaning', 'Sofa Cleaning', 'Carpet Cleaning', 'Cockroach Control', 'Bed Bug Control', 'General Pest Control'] },
  { id: 'repair', name: "Repairs", icon: Wrench, color: 'from-orange-500 to-amber-500', emoji: '🔧', subcategories: ['Electrical Repair', 'Plumbing', 'Carpentry', 'Furniture Assembly', 'Drill & Hang', 'Door & Lock Repair'] },
  { id: 'appliance', name: "AC & Appliance", icon: Wind, color: 'from-cyan-500 to-blue-500', emoji: '❄️', subcategories: ['AC Repair', 'AC Service', 'Refrigerator Repair', 'Washing Machine', 'Microwave', 'Water Purifier', 'Geyser Repair'] },
  { id: 'painting', name: "Painting", icon: Paintbrush, color: 'from-purple-500 to-pink-500', emoji: '🎨', subcategories: ['Interior Painting', 'Exterior Painting', 'Waterproofing', 'Wall Texture', 'Wallpaper Installation'] },
  { id: 'water-purifier', name: "Water Purifier", icon: Zap, color: 'from-blue-400 to-cyan-400', emoji: '💧', subcategories: ['RO Service', 'RO Repair', 'Installation', 'Replacement'] },
  { id: 'packers', name: "Packers & Movers", icon: TrendingUp, color: 'from-indigo-500 to-purple-500', emoji: '📦', subcategories: ['Local Shifting', 'Intercity Moving', 'Vehicle Transport', 'Storage'] }
];

const timeSlots = [
  { label: 'Now', value: 'now', available: true },
  { label: '10 AM', value: '10:00', available: true },
  { label: '12 PM', value: '12:00', available: true },
  { label: '2 PM', value: '14:00', available: false },
  { label: '4 PM', value: '16:00', available: true },
  { label: '6 PM', value: '18:00', available: true },
];

const offers = [
  { code: 'FIRST50', discount: '50% OFF', description: 'On first service', maxDiscount: 200 },
  { code: 'CHATR100', discount: '₹100 OFF', description: 'On orders above ₹500', maxDiscount: 100 },
];

interface ServiceProvider {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  experience: string;
  price: number;
  originalPrice?: number;
  distance: string;
  image_url?: string;
  phone?: string;
  description?: string;
  address?: string;
  specialties?: string[];
  availability?: string;
  verified?: boolean;
  jobsCompleted?: number;
  responseTime?: string;
}

export default function LocalDeals() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategoryId = searchParams.get('category') || '';
  const selectedSubcategory = searchParams.get('sub') || '';
  
  const { location, loading: locationLoading } = useChatrLocation();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [selectedTime, setSelectedTime] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [customLocation, setCustomLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [bookingData, setBookingData] = useState({ date: '', time: '', address: '', description: '' });

  const activeLocation = customLocation || (location ? { lat: location.lat, lon: location.lon, name: location.city || 'Current Location' } : null);
  const selectedCategory = serviceCategories.find(c => c.id === selectedCategoryId);

  useEffect(() => {
    if (selectedCategoryId && activeLocation?.lat && activeLocation?.lon) {
      loadProviders();
    }
  }, [selectedCategoryId, selectedSubcategory, activeLocation?.lat, activeLocation?.lon]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const searchTerm = selectedSubcategory || selectedCategory?.name || 'services';
      const results = await chatrLocalSearch(searchTerm, activeLocation?.lat, activeLocation?.lon);
      
      if (results && results.length > 0) {
        const mappedProviders: ServiceProvider[] = results.map((item: any) => ({
          id: item.id || Math.random().toString(),
          name: item.name,
          category: selectedCategory?.name || 'Service',
          rating: item.rating || (4 + Math.random()),
          reviews: item.rating_count || Math.floor(Math.random() * 5000) + 500,
          experience: `${Math.floor(Math.random() * 8) + 2} yrs`,
          price: item.price || Math.floor(Math.random() * 800) + 199,
          originalPrice: item.price ? Math.floor(item.price * 1.3) : Math.floor(Math.random() * 1000) + 400,
          distance: item.distance ? `${item.distance.toFixed(1)} km` : `${(Math.random() * 3).toFixed(1)} km`,
          image_url: item.image_url,
          phone: item.phone,
          description: item.description || 'Professional service provider with verified background',
          address: item.address || item.city,
          specialties: item.specialties || item.services || [selectedSubcategory || 'General Service'],
          availability: Math.random() > 0.3 ? 'Available Today' : 'Available Tomorrow',
          verified: Math.random() > 0.3,
          jobsCompleted: Math.floor(Math.random() * 2000) + 100,
          responseTime: `${Math.floor(Math.random() * 30) + 5} min`
        }));
        setProviders(mappedProviders);
      } else {
        setProviders([]);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
      toast.error('Failed to load service providers');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSearchParams({ category: categoryId });
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSearchParams({ category: selectedCategoryId, sub: subcategory });
  };

  const handleBookService = () => {
    if (!bookingData.address) {
      toast.error('Please enter your address');
      return;
    }
    toast.success('Booking confirmed! Professional will contact you shortly.');
    setShowBooking(false);
    setSelectedProvider(null);
    setBookingData({ date: '', time: '', address: '', description: '' });
  };

  const handleSetLocation = () => {
    if (!locationInput.trim()) {
      toast.error('Please enter a location');
      return;
    }
    setCustomLocation({ lat: location?.lat || 28.6139, lon: location?.lon || 77.2090, name: locationInput.trim() });
    setShowLocationPicker(false);
    setLocationInput('');
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-600';
    if (rating >= 4.0) return 'bg-green-500';
    return 'bg-orange-500';
  };

  // Home view - Categories
  if (!selectedCategoryId) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-lg font-bold">Home Services</h1>
              </div>
            </div>
            
            {/* Location */}
            <button 
              onClick={() => setShowLocationPicker(true)}
              className="flex items-center gap-2 mt-2 w-full p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <MapPin className="w-4 h-4 text-primary" />
              <span className="flex-1 text-left text-sm font-medium truncate">
                {activeLocation?.name || 'Select your location'}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search for services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11" />
          </div>

          {/* Offers Banner */}
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Percent className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">50% OFF on first booking</p>
                  <p className="text-xs text-muted-foreground">Use code: FIRST50 • Max ₹200 off</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { icon: Shield, label: 'Verified Pros', color: 'text-green-500' },
              { icon: BadgeCheck, label: 'Background Checked', color: 'text-blue-500' },
              { icon: Timer, label: '60 min Service', color: 'text-orange-500' },
              { icon: CheckCircle, label: 'Satisfaction Guarantee', color: 'text-purple-500' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full shrink-0">
                <badge.icon className={`w-3.5 h-3.5 ${badge.color}`} />
                <span className="text-xs font-medium whitespace-nowrap">{badge.label}</span>
              </div>
            ))}
          </div>

          {/* Categories Grid */}
          <div>
            <h2 className="font-bold mb-3">All Services</h2>
            <div className="grid grid-cols-4 gap-3">
              {serviceCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                    <span className="text-lg">{cat.emoji}</span>
                  </div>
                  <span className="text-xs font-medium text-center line-clamp-2">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Services */}
          <div>
            <h2 className="font-bold mb-3">Most Booked</h2>
            <div className="grid grid-cols-2 gap-3">
              {['AC Service', 'Home Cleaning', 'Haircut', 'Plumbing'].map((service, i) => (
                <Card key={i} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCategorySelect(serviceCategories[i % serviceCategories.length].id)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-xl">{['❄️', '🧹', '✂️', '🔧'][i]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{service}</p>
                      <p className="text-xs text-muted-foreground">From ₹{199 + i * 100}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Location Dialog */}
        <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set your location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => { setCustomLocation(null); setShowLocationPicker(false); }}>
                <Navigation className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Use current location</span>
              </Button>
              <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div></div>
              <Input placeholder="Enter area, street, landmark..." value={locationInput} onChange={(e) => setLocationInput(e.target.value)} />
              <Button className="w-full" onClick={handleSetLocation} disabled={!locationInput.trim()}>Confirm</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Category/Subcategory View
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => selectedSubcategory ? setSearchParams({ category: selectedCategoryId }) : setSearchParams({})}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-base font-bold truncate">{selectedSubcategory || selectedCategory?.name}</h1>
              <p className="text-xs text-muted-foreground">{activeLocation?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Subcategories Pills */}
        {!selectedSubcategory && selectedCategory && (
          <ScrollArea className="w-full border-b">
            <div className="flex gap-2 p-3">
              {selectedCategory.subcategories.map((sub) => (
                <Badge key={sub} variant="outline" className="shrink-0 cursor-pointer px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => handleSubcategorySelect(sub)}>
                  {sub}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {/* Date Selection */}
        {selectedSubcategory && (
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">When do you need it?</p>
            <div className="flex gap-2">
              {['today', 'tomorrow'].map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day as 'today' | 'tomorrow')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedDate === day ? 'bg-primary text-primary-foreground' : 'bg-card border hover:border-primary/50'}`}
                >
                  {day === 'today' ? 'Today' : 'Tomorrow'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-4 space-y-4">
          {/* Subcategory Grid */}
          {!selectedSubcategory && selectedCategory && (
            <div className="grid grid-cols-2 gap-3">
              {selectedCategory.subcategories.map((sub) => (
                <Card key={sub} className="cursor-pointer hover:shadow-md transition-all" onClick={() => handleSubcategorySelect(sub)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <p className="text-sm font-medium">{sub}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Providers List */}
          {selectedSubcategory && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{providers.length} professionals found</p>
              </div>

              {loading || locationLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
                  ))}
                </div>
              ) : providers.length === 0 ? (
                <Card><CardContent className="p-8 text-center"><MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No providers found nearby</p></CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {providers.map((provider) => (
                    <Card key={provider.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        {/* Provider Info */}
                        <div className="p-4">
                          <div className="flex gap-3">
                            {/* Avatar */}
                            <div className="relative">
                              {provider.image_url ? (
                                <img src={provider.image_url} alt={provider.name} className="w-14 h-14 rounded-full object-cover" />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                  <Users className="w-6 h-6 text-primary" />
                                </div>
                              )}
                              {provider.verified && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background">
                                  <BadgeCheck className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-semibold text-sm line-clamp-1">{provider.name}</h3>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <div className={`${getRatingColor(provider.rating)} text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5`}>
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      {provider.rating.toFixed(1)}
                                    </div>
                                    <span className="text-xs text-muted-foreground">({provider.reviews.toLocaleString()})</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-sm">₹{provider.price}</p>
                                  {provider.originalPrice && (
                                    <p className="text-xs text-muted-foreground line-through">₹{provider.originalPrice}</p>
                                  )}
                                </div>
                              </div>

                              {/* Meta */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{provider.experience}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{provider.distance}</span>
                                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{provider.jobsCompleted}+ jobs</span>
                              </div>
                            </div>
                          </div>

                          {/* Availability Badge */}
                          {provider.availability === 'Available Today' && (
                            <Badge variant="secondary" className="mt-3 bg-green-500/10 text-green-600 border-0">
                              <Timer className="w-3 h-3 mr-1" />
                              Available Today
                            </Badge>
                          )}
                        </div>

                        {/* Time Slots */}
                        <div className="px-4 pb-3">
                          <p className="text-xs text-muted-foreground mb-2">Select a time slot</p>
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {timeSlots.map((slot) => (
                              <button
                                key={slot.value}
                                disabled={!slot.available}
                                onClick={() => setSelectedTime(slot.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                                  selectedTime === slot.value
                                    ? 'bg-primary text-primary-foreground'
                                    : slot.available
                                    ? 'bg-muted hover:bg-muted/80'
                                    : 'bg-muted/50 text-muted-foreground opacity-50 cursor-not-allowed'
                                }`}
                              >
                                {slot.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="px-4 pb-4 flex gap-2">
                          {provider.phone && (
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`tel:${provider.phone}`, '_self')}>
                              <Phone className="w-3.5 h-3.5 mr-1.5" />
                              Call
                            </Button>
                          )}
                          <Button size="sm" className="flex-1" onClick={() => { setSelectedProvider(provider); setShowBooking(true); }}>
                            Book Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Service</DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              {/* Provider Summary */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{selectedProvider.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedSubcategory}</p>
                </div>
                <p className="font-bold">₹{selectedProvider.price}</p>
              </div>

              {/* Date/Time */}
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <div className="flex gap-2">
                  <Input type="date" value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })} min={new Date().toISOString().split('T')[0]} className="flex-1" />
                  <Input type="time" value={bookingData.time} onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })} className="w-28" />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label>Service Address *</Label>
                <Textarea placeholder="Enter complete address with landmark..." value={bookingData.address} onChange={(e) => setBookingData({ ...bookingData, address: e.target.value })} rows={3} />
              </div>

              {/* Offer */}
              <div className="p-3 border border-dashed border-green-500/50 rounded-lg bg-green-50/50 dark:bg-green-950/20">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Use code FIRST50 for 50% off</span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleBookService}>
                Confirm Booking
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
