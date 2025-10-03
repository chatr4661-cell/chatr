import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Stethoscope, Pill, Activity, Ambulance, User, Phone, MessageCircle, Video, Star, MapPin, IndianRupee, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/chatr-logo.png';

interface Provider {
  id: string;
  business_name: string;
  description: string;
  address: string;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  specializations: { name: string }[];
  services?: Array<{ name: string; price: number; duration_minutes: number }>;
}

const AlliedHealthcare = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviders();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('service_providers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_providers'
        },
        (payload) => {
          console.log('Provider changed:', payload);
          fetchProviders(); // Refresh data on changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterProviders();
  }, [searchQuery, selectedCategory, providers]);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select(`
          id,
          business_name,
          description,
          address,
          rating,
          total_reviews,
          is_verified,
          provider_specializations!inner (
            specializations (
              name
            )
          ),
          services (
            name,
            price,
            duration_minutes
          )
        `)
        .eq('is_verified', true)
        .order('rating', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(provider => ({
        ...provider,
        specializations: provider.provider_specializations.map((ps: any) => ps.specializations)
      })) || [];

      setProviders(formattedData);
      setFilteredProviders(formattedData);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load healthcare providers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = () => {
    let filtered = providers;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(provider =>
        provider.specializations.some(s => s.name.toLowerCase().includes(selectedCategory.toLowerCase()))
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(provider =>
        provider.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.specializations.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredProviders(filtered);
  };

  const getProviderInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getSpecialtyColor = (specialty: string) => {
    const colors: Record<string, string> = {
      'General Physician': 'bg-blue-500',
      'Dermatology': 'bg-purple-500',
      'Cardiology': 'bg-red-500',
      'Pediatrics': 'bg-pink-500',
      'Orthopedics': 'bg-orange-500',
      'Neurology': 'bg-indigo-500',
      'Gynecology': 'bg-rose-500',
      'Physiotherapy': 'bg-green-500',
      'Nursing Care': 'bg-teal-500',
      'Dental Care': 'bg-cyan-500',
    };
    return colors[specialty] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-sm">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="h-8 w-8 rounded-full hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-base font-semibold">Healthcare</h1>
                <p className="text-[10px] text-muted-foreground">Business Directory</p>
              </div>
            </div>
            <Avatar className="h-8 w-8 ring-1 ring-border">
              <AvatarImage src={logo} alt="User" />
              <AvatarFallback className="text-xs"><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
          </div>

          {/* Compact Search */}
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search doctors, specialists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs rounded-full bg-muted/50 border-border/50"
            />
          </div>
        </div>
      </header>

      {/* Compact Category Tabs */}
      <div className="px-3 py-2 bg-background/50 backdrop-blur-sm border-b border-border/30">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 bg-muted/50">
            <TabsTrigger value="all" className="text-xs rounded-md">All</TabsTrigger>
            <TabsTrigger value="doctor" className="text-xs rounded-md">Doctors</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Healthcare Providers Grid */}
      <div className="px-3 py-3">
        {loading ? (
          <div className="text-center py-8 text-xs text-muted-foreground">Loading...</div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">No providers found</div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {filteredProviders.slice(0, 6).map((provider) => (
              <div
                key={provider.id}
                onClick={() => navigate('/booking')}
                className="flex flex-col gap-2 p-2.5 rounded-2xl bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl border border-border/30 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
              >
                <Avatar className="h-16 w-16 mx-auto ring-2 ring-border/20">
                  <AvatarImage src="" alt={provider.business_name} />
                  <AvatarFallback className={`${getSpecialtyColor(provider.specializations[0]?.name || '')} text-white text-sm font-medium`}>
                    {getProviderInitials(provider.business_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center space-y-0.5">
                  <p className="font-medium text-[11px] leading-tight line-clamp-1">
                    {provider.business_name.split(' - ')[0]}
                  </p>
                  <p className="text-[9px] text-muted-foreground line-clamp-1">
                    {provider.specializations[0]?.name}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                    <span className="text-[10px] font-medium">{provider.rating}</span>
                    <span className="text-[9px] text-muted-foreground">({provider.total_reviews})</span>
                  </div>
                  {provider.services && provider.services[0] && (
                    <div className="flex items-center justify-center gap-0.5 text-primary">
                      <IndianRupee className="h-2.5 w-2.5" />
                      <span className="text-[10px] font-medium">{provider.services[0].price}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compact Services */}
      <div className="px-3 py-2">
        <h2 className="text-xs font-semibold mb-2">Quick Services</h2>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Stethoscope className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-[11px] font-medium">Consult</span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur-sm border border-green-500/20 hover:border-green-500/40 transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <Pill className="h-4 w-4 text-white" />
            </div>
            <span className="text-[11px] font-medium">Medicine</span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 backdrop-blur-sm border border-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-[11px] font-medium">Lab Tests</span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 backdrop-blur-sm border border-red-500/20 hover:border-red-500/40 transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <Ambulance className="h-4 w-4 text-white" />
            </div>
            <span className="text-[11px] font-medium">Emergency</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-lg z-50">
        <div className="flex items-center justify-around py-1.5 max-w-md mx-auto">
          <button 
            onClick={() => navigate('/')}
            className="flex flex-col items-center gap-0.5 px-4 py-1"
          >
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="text-[9px] font-medium text-primary">Home</span>
          </button>
          <button 
            onClick={() => navigate('/booking')}
            className="flex flex-col items-center gap-0.5 px-4 py-1"
          >
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">Book</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 px-4 py-1">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">Track</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AlliedHealthcare;
