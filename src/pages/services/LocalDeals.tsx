import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, MapPin, Star, Clock, Shield, ChevronRight, 
  Wrench, Zap, Paintbrush, Droplets, Wind, Scissors,
  History, TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface ServiceProvider {
  id: string;
  business_name: string;
  description: string;
  hourly_rate: number;
  rating_average: number;
  rating_count: number;
  completed_jobs: number;
  verified: boolean;
  category_id: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'plumbing': <Droplets className="h-6 w-6" />,
  'electrical': <Zap className="h-6 w-6" />,
  'carpentry': <Wrench className="h-6 w-6" />,
  'painting': <Paintbrush className="h-6 w-6" />,
  'cleaning': <Scissors className="h-6 w-6" />,
  'hvac': <Wind className="h-6 w-6" />,
};

const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'plumbing', name: 'Plumbing', icon: 'plumbing', description: 'Pipes, leaks, installations' },
  { id: 'electrical', name: 'Electrical', icon: 'electrical', description: 'Wiring, repairs, fixtures' },
  { id: 'carpentry', name: 'Carpentry', icon: 'carpentry', description: 'Furniture, doors, cabinets' },
  { id: 'painting', name: 'Painting', icon: 'painting', description: 'Interior & exterior' },
  { id: 'cleaning', name: 'Cleaning', icon: 'cleaning', description: 'Deep clean, sanitization' },
  { id: 'hvac', name: 'AC/HVAC', icon: 'hvac', description: 'Repair & maintenance' },
];

// Calculate competitive price (15% less than market)
const getCompetitivePrice = (marketPrice: number) => {
  return Math.round(marketPrice * 0.85);
};

export default function LocalDeals() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('home_service_providers')
        .select('*')
        .eq('verified', true)
        .order('rating_average', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load service providers');
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         provider.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || provider.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Local Services</h1>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-primary-foreground"
            onClick={() => navigate('/services/history')}
          >
            <History className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Competitive pricing banner */}
        <div className="bg-white/20 rounded-lg p-3 mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          <span className="text-sm font-medium">15% Lower than Urban Company & Market Rates</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white text-foreground"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 -mt-6">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {SERVICE_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.id ? null : category.id
                  )}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                    selectedCategory === category.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {CATEGORY_ICONS[category.icon]}
                  <span className="text-xs font-medium mt-1">{category.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Providers List */}
      <div className="px-4 mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available Providers</h2>
          <Badge variant="outline">{filteredProviders.length} found</Badge>
        </div>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : filteredProviders.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No service providers found</p>
          </Card>
        ) : (
          filteredProviders.map((provider) => (
            <Card 
              key={provider.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/services/provider/${provider.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{provider.business_name}</h3>
                      {provider.verified && (
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {provider.description}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{provider.rating_average}</span>
                        <span className="text-xs text-muted-foreground">
                          ({provider.rating_count})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {provider.completed_jobs} jobs
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground line-through">
                      ₹{provider.hourly_rate}/hr
                    </div>
                    <div className="text-lg font-bold text-primary">
                      ₹{getCompetitivePrice(provider.hourly_rate)}/hr
                    </div>
                    <Badge variant="destructive" className="text-xs mt-1">
                      15% OFF
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Within 5km</span>
                  </div>
                  <Button size="sm" className="gap-1">
                    Book Now <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
