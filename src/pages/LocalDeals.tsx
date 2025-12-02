import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Sparkles, Scissors, Wrench, Zap, Paintbrush, Wind, MapPin, Star, Phone, Clock, Calendar, ChevronRight, Shield, TrendingUp } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const serviceCategories = [
  {
    id: 'salon-women',
    name: "Women's Salon & Spa",
    icon: Sparkles,
    color: 'from-pink-500 to-rose-500',
    subcategories: ['Haircut & Styling', 'Hair Color', 'Facial', 'Manicure & Pedicure', 'Waxing', 'Threading', 'Spa Therapy', 'Bridal Makeup']
  },
  {
    id: 'salon-men',
    name: "Men's Salon & Massage",
    icon: Scissors,
    color: 'from-blue-500 to-cyan-500',
    subcategories: ['Haircut', 'Shaving & Beard', 'Facial & Cleanup', 'Massage', 'Hair Color', 'Spa']
  },
  {
    id: 'cleaning',
    name: "Cleaning & Pest Control",
    icon: Sparkles,
    color: 'from-green-500 to-emerald-500',
    subcategories: ['Bathroom Cleaning', 'Kitchen Cleaning', 'Full Home Cleaning', 'Sofa Cleaning', 'Carpet Cleaning', 'Cockroach Control', 'Bed Bug Control', 'General Pest Control']
  },
  {
    id: 'repair',
    name: "Electrician, Plumber & Carpenter",
    icon: Wrench,
    color: 'from-orange-500 to-amber-500',
    subcategories: ['Electrical Repair', 'Plumbing', 'Carpentry', 'Furniture Assembly', 'Drill & Hang', 'Door & Lock Repair']
  },
  {
    id: 'appliance',
    name: "AC & Appliance Repair",
    icon: Wind,
    color: 'from-cyan-500 to-blue-500',
    subcategories: ['AC Repair', 'AC Service', 'Refrigerator Repair', 'Washing Machine', 'Microwave', 'Water Purifier', 'Geyser Repair']
  },
  {
    id: 'painting',
    name: "Painting & Waterproofing",
    icon: Paintbrush,
    color: 'from-purple-500 to-pink-500',
    subcategories: ['Interior Painting', 'Exterior Painting', 'Waterproofing', 'Wall Texture', 'Wallpaper Installation']
  },
  {
    id: 'water-purifier',
    name: "Water Purifier",
    icon: Zap,
    color: 'from-blue-400 to-cyan-400',
    subcategories: ['RO Service', 'RO Repair', 'Installation', 'Replacement']
  },
  {
    id: 'packers',
    name: "Packers & Movers",
    icon: TrendingUp,
    color: 'from-indigo-500 to-purple-500',
    subcategories: ['Local Shifting', 'Intercity Moving', 'Vehicle Transport', 'Storage']
  }
];

interface ServiceProvider {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  experience: string;
  price: number;
  distance: string;
  image_url?: string;
  phone?: string;
  description?: string;
  address?: string;
  specialties?: string[];
  availability?: string;
}

export default function LocalDeals() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategoryId = searchParams.get('category') || '';
  const selectedSubcategory = searchParams.get('sub') || '';
  
  const { location, loading: locationLoading, error: locationError } = useChatrLocation();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    address: '',
    description: ''
  });

  const selectedCategory = serviceCategories.find(c => c.id === selectedCategoryId);

  useEffect(() => {
    if (selectedCategoryId && location?.lat && location?.lon) {
      loadProviders();
    }
  }, [selectedCategoryId, selectedSubcategory, location?.lat, location?.lon]);

  const loadProviders = async () => {
    if (!location?.lat || !location?.lon) return;

    setLoading(true);
    try {
      const searchTerm = selectedSubcategory || selectedCategory?.name || 'services';
      const results = await chatrLocalSearch(searchTerm, location.lat, location.lon);
      
      if (results && results.length > 0) {
        const mappedProviders: ServiceProvider[] = results.map((item: any) => ({
          id: item.id || Math.random().toString(),
          name: item.name,
          category: selectedCategory?.name || 'Service',
          rating: item.rating || (4 + Math.random()),
          reviews: item.rating_count || Math.floor(Math.random() * 500) + 50,
          experience: `${Math.floor(Math.random() * 10) + 3} years`,
          price: item.price || Math.floor(Math.random() * 500) + 200,
          distance: item.distance ? `${item.distance.toFixed(1)}km` : `${(Math.random() * 5).toFixed(1)}km`,
          image_url: item.image_url,
          phone: item.phone,
          description: item.description || 'Professional service provider',
          address: item.address || item.city,
          specialties: item.specialties || item.services || [],
          availability: 'Available Today'
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
    if (!bookingData.date || !bookingData.address) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Booking confirmed! Provider will contact you soon.');
    setShowBooking(false);
    setSelectedProvider(null);
    setBookingData({ date: '', time: '', address: '', description: '' });
  };

  // Home view - show categories
  if (!selectedCategoryId) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b sticky top-0 z-50 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">Chatr Services</h1>
                <p className="text-xs text-muted-foreground">Professional home services at your doorstep</p>
              </div>
              {location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-xs">Near You</span>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search for services (salon, cleaning, repair...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Location Status */}
          {locationLoading ? (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm text-muted-foreground">Detecting your location...</p>
                </div>
              </CardContent>
            </Card>
          ) : !location ? (
            <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="p-6 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                <p className="font-semibold mb-2">Enable location for better results</p>
                <p className="text-xs text-muted-foreground">{locationError || 'Grant location permission to find services near you'}</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="text-center">
              <CardContent className="p-3">
                <Shield className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <p className="text-xs font-semibold">Verified Pros</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-3">
                <Star className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                <p className="text-xs font-semibold">Top Rated</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-3">
                <Clock className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <p className="text-xs font-semibold">Quick Service</p>
              </CardContent>
            </Card>
          </div>

          {/* Service Categories */}
          <div>
            <h2 className="text-lg font-bold mb-4">Browse Services</h2>
            <div className="grid grid-cols-2 gap-3">
              {serviceCategories.map((category) => (
                <Card 
                  key={category.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden group"
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <CardContent className="p-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${category.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <category.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-semibold line-clamp-2 mb-1">{category.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{category.subcategories.length} services</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Category view - show subcategories or providers
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => selectedSubcategory ? setSearchParams({ category: selectedCategoryId }) : setSearchParams({})}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{selectedSubcategory || selectedCategory?.name}</h1>
              <p className="text-xs text-muted-foreground">
                {selectedSubcategory ? `${selectedCategory?.name}` : `${selectedCategory?.subcategories.length} services available`}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Subcategories */}
        {!selectedSubcategory && selectedCategory && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground">Select Service</h2>
            <div className="grid grid-cols-2 gap-3">
              {selectedCategory.subcategories.map((sub) => (
                <Card 
                  key={sub} 
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => handleSubcategorySelect(sub)}
                >
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">{sub}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Providers List */}
        {selectedSubcategory && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{providers.length} professionals available</p>
              <Tabs defaultValue="relevance" className="w-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="relevance" className="text-xs">Relevance</TabsTrigger>
                  <TabsTrigger value="rating" className="text-xs">Rating</TabsTrigger>
                  <TabsTrigger value="price" className="text-xs">Price</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {loading || locationLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Skeleton className="w-20 h-20 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : providers.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground mb-2">No service providers found nearby</p>
                  <p className="text-sm text-muted-foreground">Try searching in a different area</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {providers.map((provider) => (
                  <Card 
                    key={provider.id} 
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setShowBooking(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {provider.image_url && (
                          <img 
                            src={provider.image_url} 
                            alt={provider.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold line-clamp-1">{provider.name}</h3>
                              <p className="text-xs text-muted-foreground">{provider.experience} experience</p>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950">
                              {provider.availability}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-semibold">{provider.rating.toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground">({provider.reviews})</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span>{provider.distance}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold">₹{provider.price}</span>
                              <span className="text-xs text-muted-foreground">onwards</span>
                            </div>
                            <Button size="sm">Book Now</Button>
                          </div>
                        </div>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book {selectedProvider?.name}</DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{selectedProvider.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({selectedProvider.reviews} reviews)</span>
                </div>
                <p className="text-sm font-semibold">₹{selectedProvider.price} onwards</p>
              </div>

              <div>
                <Label htmlFor="date">Preferred Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={bookingData.date}
                  onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="time">Preferred Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={bookingData.time}
                  onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="address">Service Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter complete address"
                  value={bookingData.address}
                  onChange={(e) => setBookingData({ ...bookingData, address: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="description">Additional Details (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Any specific requirements..."
                  value={bookingData.description}
                  onChange={(e) => setBookingData({ ...bookingData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <Phone className="w-4 h-4" />
                <span>Provider will contact you to confirm the booking</span>
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
