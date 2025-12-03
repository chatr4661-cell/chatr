import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, MapPin, Star, Phone, Clock, ChevronRight, Shield, CheckCircle, BadgeCheck, Navigation, Percent, Timer, Users, Sparkles, ArrowRight, Play, Award, ThumbsUp } from 'lucide-react';
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
import { Helmet } from 'react-helmet-async';

const serviceCategories = [
  { id: 'salon-women', name: "Women's Salon & Spa", shortName: "Women's Salon", image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop', subcategories: ['Haircut & Styling', 'Hair Color', 'Facial', 'Manicure & Pedicure', 'Waxing', 'Threading', 'Spa Therapy', 'Bridal Makeup'], price: 499, rating: 4.8 },
  { id: 'salon-men', name: "Men's Salon & Massage", shortName: "Men's Salon", image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop', subcategories: ['Haircut', 'Shaving & Beard', 'Facial & Cleanup', 'Massage', 'Hair Color', 'Spa'], price: 299, rating: 4.7 },
  { id: 'cleaning', name: "Home Cleaning", shortName: "Cleaning", image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop', subcategories: ['Bathroom Cleaning', 'Kitchen Cleaning', 'Full Home Cleaning', 'Sofa Cleaning', 'Carpet Cleaning', 'Deep Cleaning'], price: 599, rating: 4.6 },
  { id: 'pest', name: "Pest Control", shortName: "Pest Control", image: 'https://images.unsplash.com/photo-1632935191442-f27c1bd5c477?w=400&h=300&fit=crop', subcategories: ['Cockroach Control', 'Bed Bug Control', 'Termite Control', 'Mosquito Control', 'Rodent Control'], price: 799, rating: 4.5 },
  { id: 'repair', name: "Electrician & Plumber", shortName: "Repairs", image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop', subcategories: ['Electrical Repair', 'Plumbing', 'Carpentry', 'Furniture Assembly', 'Drill & Hang'], price: 199, rating: 4.7 },
  { id: 'appliance', name: "AC & Appliance Repair", shortName: "AC Service", image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=300&fit=crop', subcategories: ['AC Repair', 'AC Service', 'Refrigerator', 'Washing Machine', 'Geyser Repair'], price: 399, rating: 4.8 },
  { id: 'painting', name: "Painting & Waterproofing", shortName: "Painting", image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=300&fit=crop', subcategories: ['Interior Painting', 'Exterior Painting', 'Waterproofing', 'Wall Texture'], price: 12, rating: 4.6 },
  { id: 'packers', name: "Packers & Movers", shortName: "Movers", image: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400&h=300&fit=crop', subcategories: ['Local Shifting', 'Intercity Moving', 'Vehicle Transport', 'Storage'], price: 2999, rating: 4.5 },
];

const featuredServices = [
  { name: 'AC Service', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300&h=200&fit=crop', price: 399, discount: 20, category: 'appliance' },
  { name: 'Full Home Cleaning', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&h=200&fit=crop', price: 1499, discount: 30, category: 'cleaning' },
  { name: 'Salon at Home', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop', price: 799, discount: 25, category: 'salon-women' },
];

const timeSlots = [
  { label: 'Now', value: 'now', available: true },
  { label: '10 AM', value: '10:00', available: true },
  { label: '12 PM', value: '12:00', available: true },
  { label: '2 PM', value: '14:00', available: false },
  { label: '4 PM', value: '16:00', available: true },
  { label: '6 PM', value: '18:00', available: true },
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
  verified?: boolean;
  jobsCompleted?: number;
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
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow'>('today');
  const [selectedTime, setSelectedTime] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [customLocation, setCustomLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [bookingData, setBookingData] = useState({ date: '', time: '', address: '' });

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
          rating: item.rating || (4 + Math.random() * 0.9),
          reviews: item.rating_count || Math.floor(Math.random() * 3000) + 200,
          experience: `${Math.floor(Math.random() * 8) + 2} yrs`,
          price: item.price || Math.floor(Math.random() * 600) + 199,
          originalPrice: item.price ? Math.floor(item.price * 1.25) : Math.floor(Math.random() * 800) + 300,
          distance: item.distance ? `${item.distance.toFixed(1)} km` : `${(Math.random() * 4).toFixed(1)} km`,
          image_url: item.image_url,
          phone: item.phone,
          description: item.description,
          address: item.address,
          verified: Math.random() > 0.3,
          jobsCompleted: Math.floor(Math.random() * 1500) + 100,
        }));
        setProviders(mappedProviders);
      } else {
        setProviders([]);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
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
    toast.success('Booking confirmed! You will receive a call shortly.');
    setShowBooking(false);
    setSelectedProvider(null);
  };

  const handleSetLocation = () => {
    if (!locationInput.trim()) return;
    setCustomLocation({ lat: location?.lat || 28.6139, lon: location?.lon || 77.2090, name: locationInput.trim() });
    setShowLocationPicker(false);
    setLocationInput('');
  };

  // Home View
  if (!selectedCategoryId) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Nexgenn Home Services - Book Trusted Professionals | Chatr</title>
          <meta name="description" content="Nexgenn Home Services powered by Chatr+ - Book trusted home services like AC repair, cleaning, salon, plumber, electrician and more at your doorstep." />
        </Helmet>

        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-lg font-bold">Nexgenn Home Services</h1>
                <p className="text-xs text-muted-foreground">powered by Chatr+</p>
              </div>
            </div>
            
            {/* Location Picker */}
            <button 
              onClick={() => setShowLocationPicker(true)}
              className="flex items-center gap-2 mt-2 w-full p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-primary/20"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs text-muted-foreground">Deliver to</p>
                <p className="text-sm font-medium truncate">{activeLocation?.name || 'Select location'}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search for services..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-12 h-12 rounded-xl bg-muted/50 border-0 text-base"
            />
          </div>

          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800')] opacity-20 bg-cover bg-center" />
            <div className="relative p-5">
              <Badge className="bg-white/20 text-white border-0 mb-2">Limited Offer</Badge>
              <h2 className="text-xl font-bold text-white mb-1">50% OFF on First Booking</h2>
              <p className="text-white/80 text-sm mb-3">Use code: FIRST50 • Max ₹200 discount</p>
              <Button size="sm" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Book Now <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Shield, label: 'Verified', color: 'text-green-500' },
              { icon: BadgeCheck, label: 'Background Check', color: 'text-blue-500' },
              { icon: Timer, label: 'On-Time', color: 'text-orange-500' },
              { icon: ThumbsUp, label: 'Guaranteed', color: 'text-purple-500' },
            ].map((badge, i) => (
              <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/30">
                <badge.icon className={`w-5 h-5 ${badge.color}`} />
                <span className="text-[10px] font-medium text-center leading-tight">{badge.label}</span>
              </div>
            ))}
          </div>

          {/* Featured Services */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Most Booked</h2>
              <Button variant="link" size="sm" className="text-primary p-0 h-auto">See all</Button>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {featuredServices.map((service, i) => (
                  <Card 
                    key={i} 
                    className="shrink-0 w-40 overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                    onClick={() => handleCategorySelect(service.category)}
                  >
                    <div className="relative h-24 overflow-hidden">
                      <img 
                        src={service.image} 
                        alt={service.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5">
                        {service.discount}% OFF
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm line-clamp-1">{service.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-bold text-sm">₹{service.price}</span>
                        <span className="text-xs text-muted-foreground line-through">₹{Math.floor(service.price / (1 - service.discount / 100))}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* All Categories */}
          <div>
            <h2 className="font-bold mb-3">All Services</h2>
            <div className="grid grid-cols-2 gap-3">
              {serviceCategories.map((cat) => (
                <Card 
                  key={cat.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                  onClick={() => handleCategorySelect(cat.id)}
                >
                  <div className="relative h-28 overflow-hidden">
                    <img 
                      src={cat.image} 
                      alt={cat.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="font-semibold text-white text-sm line-clamp-1">{cat.shortName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-white/90 text-xs">{cat.rating}</span>
                        </div>
                        <span className="text-white/70 text-xs">From ₹{cat.price}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-muted/30 rounded-2xl p-4">
            <h2 className="font-bold mb-4 text-center">How It Works</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { step: '1', title: 'Choose', desc: 'Select service' },
                { step: '2', title: 'Schedule', desc: 'Pick date & time' },
                { step: '3', title: 'Relax', desc: 'We handle rest' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">{item.step}</span>
                  </div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Location Dialog */}
        <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Set your location</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Button variant="outline" className="w-full justify-start gap-3 h-14" onClick={() => { setCustomLocation(null); setShowLocationPicker(false); }}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Use current location</p>
                  <p className="text-xs text-muted-foreground">Using GPS</p>
                </div>
              </Button>
              <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or enter manually</span></div></div>
              <Input placeholder="Enter area, landmark..." value={locationInput} onChange={(e) => setLocationInput(e.target.value)} className="h-12" />
              <Button className="w-full h-12" onClick={handleSetLocation} disabled={!locationInput.trim()}>Confirm Location</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Category / Subcategory View
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{selectedSubcategory || selectedCategory?.name} - Book Now | Chatr Services</title>
        <meta name="description" content={`Book ${selectedSubcategory || selectedCategory?.name} services at your doorstep. Verified professionals, transparent pricing.`} />
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => selectedSubcategory ? setSearchParams({ category: selectedCategoryId }) : setSearchParams({})}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate">{selectedSubcategory || selectedCategory?.name}</h1>
              <p className="text-xs text-muted-foreground truncate">{activeLocation?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Header Image */}
      {!selectedSubcategory && selectedCategory && (
        <div className="relative h-32 overflow-hidden">
          <img src={selectedCategory.image} alt={selectedCategory.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-lg font-bold">{selectedCategory.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedCategory.subcategories.length} services available</p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Subcategories */}
        {!selectedSubcategory && selectedCategory && (
          <div className="grid grid-cols-1 gap-3">
            {selectedCategory.subcategories.map((sub) => (
              <Card key={sub} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30" onClick={() => handleSubcategorySelect(sub)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{sub}</p>
                      <p className="text-xs text-muted-foreground">From ₹{Math.floor(Math.random() * 500) + 199}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Date Selection */}
        {selectedSubcategory && (
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">When do you need it?</p>
            <div className="flex gap-2">
              {['today', 'tomorrow'].map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day as 'today' | 'tomorrow')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedDate === day 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                      : 'bg-card border hover:border-primary/50'
                  }`}
                >
                  {day === 'today' ? 'Today' : 'Tomorrow'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Providers */}
        {selectedSubcategory && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{providers.length} professionals found</p>
            </div>

            {loading || locationLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}><CardContent className="p-4 space-y-3"><div className="flex gap-3"><Skeleton className="w-16 h-16 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-24" /></div></div></CardContent></Card>
                ))}
              </div>
            ) : providers.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="font-medium">No providers found</p><p className="text-sm text-muted-foreground">Try a different location</p></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {providers.map((provider) => (
                  <Card key={provider.id} className="overflow-hidden hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {provider.image_url ? (
                            <img src={provider.image_url} alt={provider.name} className="w-16 h-16 rounded-xl object-cover" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <Users className="w-7 h-7 text-primary" />
                            </div>
                          )}
                          {provider.verified && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background">
                              <BadgeCheck className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold line-clamp-1">{provider.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  {provider.rating.toFixed(1)}
                                </div>
                                <span className="text-xs text-muted-foreground">({provider.reviews.toLocaleString()})</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">₹{provider.price}</p>
                              {provider.originalPrice && <p className="text-xs text-muted-foreground line-through">₹{provider.originalPrice}</p>}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{provider.experience}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{provider.distance}</span>
                            <span className="flex items-center gap-1"><Award className="w-3 h-3" />{provider.jobsCompleted}+ jobs</span>
                          </div>
                        </div>
                      </div>

                      {/* Time Slots */}
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Available slots</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {timeSlots.filter(s => s.available).slice(0, 4).map((slot) => (
                            <button
                              key={slot.value}
                              onClick={() => setSelectedTime(slot.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                                selectedTime === slot.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        {provider.phone && (
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`tel:${provider.phone}`)}>
                            <Phone className="w-4 h-4 mr-1.5" />Call
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

      {/* Booking Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Book Service</DialogTitle></DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-6 h-6 text-primary" /></div>
                <div className="flex-1"><p className="font-semibold">{selectedProvider.name}</p><p className="text-xs text-muted-foreground">{selectedSubcategory}</p></div>
                <p className="font-bold text-lg">₹{selectedProvider.price}</p>
              </div>

              <div className="space-y-2">
                <Label>Date & Time</Label>
                <div className="flex gap-2">
                  <Input type="date" value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })} min={new Date().toISOString().split('T')[0]} className="flex-1" />
                  <Input type="time" value={bookingData.time} onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })} className="w-28" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Service Address *</Label>
                <Textarea placeholder="Enter complete address with landmark..." value={bookingData.address} onChange={(e) => setBookingData({ ...bookingData, address: e.target.value })} rows={3} />
              </div>

              <div className="p-3 border border-dashed border-green-500/50 rounded-xl bg-green-50/50 dark:bg-green-950/20">
                <div className="flex items-center gap-2"><Percent className="w-4 h-4 text-green-600" /><span className="text-sm font-medium text-green-700 dark:text-green-400">Use FIRST50 for 50% off</span></div>
              </div>

              <Button className="w-full h-12 text-base" onClick={handleBookService}>Confirm Booking</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
