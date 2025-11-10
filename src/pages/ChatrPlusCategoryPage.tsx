import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  ArrowLeft, 
  Filter,
  Star,
  MapPin,
  SlidersHorizontal,
  TrendingUp,
  DollarSign,
  Loader2,
  Navigation,
  UtensilsCrossed,
  Wrench,
  Stethoscope,
  Sparkles as SparklesIcon,
  Briefcase,
  GraduationCap,
  Store
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const ITEMS_PER_PAGE = 12;

interface Filters {
  priceMin: number;
  priceMax: number;
  minRating: number;
  maxDistance: number;
}

export default function ChatrPlusCategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [sortBy, setSortBy] = useState<'relevance' | 'price_low' | 'price_high' | 'rating' | 'distance'>('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState<Filters>({
    priceMin: 0,
    priceMax: 5000,
    minRating: 0,
    maxDistance: 50
  });

  const categoryIcons: Record<string, any> = {
    'food': UtensilsCrossed,
    'home-services': Wrench,
    'healthcare': Stethoscope,
    'beauty-wellness': SparklesIcon,
    'jobs': Briefcase,
    'education': GraduationCap,
    'business': Store
  };

  // Get user's location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        setUserLocation({
          lat: coordinates.coords.latitude,
          lng: coordinates.coords.longitude
        });
      } catch (error) {
        console.log('Location access denied or unavailable');
      }
    };

    if (Capacitor.isNativePlatform()) {
      getLocation();
    }
  }, []);

  // Fetch category details
  const { data: category } = useQuery({
    queryKey: ['chatr-plus-category', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatr_plus_categories')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch services with filters
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['chatr-plus-category-services', slug, filters, sortBy, currentPage],
    queryFn: async () => {
      if (!category) return { services: [], total: 0 };

      let query = supabase
        .from('chatr_plus_services')
        .select(`
          *,
          seller:chatr_plus_sellers(*),
          category:chatr_plus_categories(name, slug)
        `, { count: 'exact' })
        .eq('category_id', category.id)
        .eq('is_active', true);

      // Apply price filter
      if (filters.priceMin > 0) {
        query = query.gte('price', filters.priceMin);
      }
      if (filters.priceMax < 5000) {
        query = query.lte('price', filters.priceMax);
      }

      // Apply rating filter
      if (filters.minRating > 0) {
        query = query.gte('rating_average', filters.minRating);
      }

      // Apply sorting
      switch (sortBy) {
        case 'price_low':
          query = query.order('price', { ascending: true });
          break;
        case 'price_high':
          query = query.order('price', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating_average', { ascending: false });
          break;
        default:
          query = query.order('is_featured', { ascending: false })
                       .order('booking_count', { ascending: false });
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) throw error;
      return { services: data || [], total: count || 0 };
    },
    enabled: !!category
  });

  // Calculate distance for services
  const servicesWithDistance = servicesData?.services.map((service: any) => {
    if (!userLocation || !service.seller?.latitude || !service.seller?.longitude) {
      return { ...service, distance: null };
    }

    const R = 6371; // Earth's radius in km
    const dLat = ((service.seller.latitude - userLocation.lat) * Math.PI) / 180;
    const dLon = ((service.seller.longitude - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((service.seller.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return { ...service, distance };
  }) || [];

  // Filter by distance and sort if needed
  const filteredServices = servicesWithDistance
    .filter(service => !service.distance || service.distance <= filters.maxDistance)
    .sort((a, b) => {
      if (sortBy === 'distance' && a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return 0;
    });

  const totalPages = Math.ceil((servicesData?.total || 0) / ITEMS_PER_PAGE);

  const priceRanges = [
    { label: 'All Prices', min: 0, max: 5000 },
    { label: '₹0 - ₹500', min: 0, max: 500 },
    { label: '₹500 - ₹1000', min: 500, max: 1000 },
    { label: '₹1000 - ₹2000', min: 1000, max: 2000 },
    { label: '₹2000 - ₹5000', min: 2000, max: 5000 }
  ];

  const Icon = category ? categoryIcons[category.slug] : Store;

  if (!category && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Category Not Found</h2>
          <Button onClick={() => navigate('/chatr-plus')}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chatr-plus')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{category?.name || 'Loading...'}</h1>
              <p className="text-sm text-muted-foreground">
                {filteredServices.length} services available
              </p>
            </div>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Services</SheetTitle>
                <SheetDescription>
                  Refine your search with filters
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Price Range */}
                <div>
                  <Label className="mb-3 block">Price Range</Label>
                  <div className="space-y-2">
                    {priceRanges.map((range) => (
                      <Button
                        key={range.label}
                        variant={
                          filters.priceMin === range.min && filters.priceMax === range.max
                            ? 'default'
                            : 'outline'
                        }
                        className="w-full justify-start"
                        onClick={() => setFilters({
                          ...filters,
                          priceMin: range.min,
                          priceMax: range.max
                        })}
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>₹{filters.priceMin}</span>
                      <span>₹{filters.priceMax}</span>
                    </div>
                    <Slider
                      value={[filters.priceMin, filters.priceMax]}
                      min={0}
                      max={5000}
                      step={100}
                      onValueChange={([min, max]) => setFilters({
                        ...filters,
                        priceMin: min,
                        priceMax: max
                      })}
                    />
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <Label className="mb-3 block">Minimum Rating</Label>
                  <div className="space-y-2">
                    {[
                      { label: 'All Ratings', value: 0 },
                      { label: '3+ Stars', value: 3 },
                      { label: '4+ Stars', value: 4 },
                      { label: '4.5+ Stars', value: 4.5 }
                    ].map((option) => (
                      <Button
                        key={option.label}
                        variant={filters.minRating === option.value ? 'default' : 'outline'}
                        className="w-full justify-start gap-2"
                        onClick={() => setFilters({ ...filters, minRating: option.value })}
                      >
                        <Star className="w-4 h-4 fill-current" />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Distance Filter */}
                {userLocation && (
                  <div>
                    <Label className="mb-3 block">
                      Maximum Distance: {filters.maxDistance}km
                    </Label>
                    <Slider
                      value={[filters.maxDistance]}
                      min={1}
                      max={50}
                      step={1}
                      onValueChange={([value]) => setFilters({
                        ...filters,
                        maxDistance: value
                      })}
                    />
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => setFilters({
                    priceMin: 0,
                    priceMax: 5000,
                    minRating: 0,
                    maxDistance: 50
                  })}
                  variant="outline"
                >
                  Reset Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Hero Banner */}
      {category && (
        <div className={`bg-gradient-to-r from-${category.color_scheme}-500/20 to-${category.color_scheme}-600/20 border-b`}>
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center gap-6">
              <div className={`bg-gradient-to-br from-${category.color_scheme}-500 to-${category.color_scheme}-600 p-6 rounded-2xl`}>
                {Icon && <Icon className="w-12 h-12 text-white" />}
              </div>
              <div>
                <h2 className="text-4xl font-bold mb-2">{category.name}</h2>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  {category.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Sort & Stats Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Most Relevant</span>
                  </div>
                </SelectItem>
                <SelectItem value="price_low">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Price: Low to High</span>
                  </div>
                </SelectItem>
                <SelectItem value="price_high">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Price: High to Low</span>
                  </div>
                </SelectItem>
                <SelectItem value="rating">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    <span>Highest Rated</span>
                  </div>
                </SelectItem>
                {userLocation && (
                  <SelectItem value="distance">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      <span>Nearest First</span>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {userLocation && (
              <Badge variant="secondary" className="gap-1">
                <Navigation className="w-3 h-3" />
                GPS Enabled
              </Badge>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Services Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredServices.length === 0 ? (
          <Card className="p-12 text-center">
            <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No services found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or check back later
            </p>
            <Button onClick={() => setFilters({
              priceMin: 0,
              priceMax: 5000,
              minRating: 0,
              maxDistance: 50
            })}>
              Reset Filters
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredServices.map((service: any, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-all overflow-hidden h-full"
                    onClick={() => navigate(`/chatr-plus/service/${service.id}`)}
                  >
                    {service.image_url && (
                      <div className="h-48 bg-muted overflow-hidden">
                        <img
                          src={service.image_url}
                          alt={service.service_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">
                          {service.service_name}
                        </h3>
                        {service.is_featured && (
                          <Badge className="bg-primary/10 text-primary text-xs">
                            Featured
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {service.description}
                      </p>

                      <div className="flex items-center gap-2 mb-3">
                        {service.seller?.logo_url && (
                          <img
                            src={service.seller.logo_url}
                            alt={service.seller.business_name}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-sm font-medium line-clamp-1">
                          {service.seller?.business_name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-medium">
                              {service.rating_average || service.seller?.rating_average || '4.5'}
                            </span>
                          </div>
                          {service.distance !== null && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="text-xs">
                                {service.distance.toFixed(1)}km
                              </span>
                            </div>
                          )}
                        </div>
                        {service.price && (
                          <div className="text-lg font-bold text-primary">
                            ₹{service.price}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant={currentPage === totalPages ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
