import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Star, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceProvider {
  id: string;
  business_name: string;
  description: string;
  rating_average: number;
  rating_count: number;
  city: string;
  address: string;
  is_online: boolean;
  profile_image_url: string;
  base_price: number;
  experience_years: number;
}

const ServiceListing = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviders();
  }, [categoryId]);

  const fetchProviders = async () => {
    try {
      const { data: category } = await supabase
        .from('service_categories')
        .select('name')
        .eq('id', categoryId)
        .single();

      if (category) setCategoryName(category.name);

      // Get all providers for now - can add category filtering later
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('is_verified', true)
        .eq('is_active', true)
        .order('rating_average', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter(p =>
    p.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-gradient-glass backdrop-blur-glass border-b border-glass-border">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">{categoryName}</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No providers found</div>
        ) : (
          filteredProviders.map((provider) => (
            <Card
              key={provider.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/provider/${provider.id}`)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {provider.profile_image_url ? (
                      <img src={provider.profile_image_url} alt={provider.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-primary">
                        {provider.business_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{provider.business_name}</CardTitle>
                      <div className={`px-2 py-1 rounded-full text-xs ${provider.is_online ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        {provider.is_online ? 'Online' : 'Offline'}
                      </div>
                    </div>
                    <CardDescription className="mt-1 line-clamp-2">
                      {provider.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-medium">{provider.rating_average?.toFixed(1) || 'New'}</span>
                      <span className="text-muted-foreground">({provider.rating_count || 0})</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{provider.experience_years}y exp</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Starting from</div>
                    <div className="text-lg font-bold text-primary">₹{provider.base_price}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                  <MapPin className="h-4 w-4" />
                  <span>{provider.city}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ServiceListing;
