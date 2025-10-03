import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Stethoscope, Pill, Activity, Ambulance, User, Phone, MessageCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">HealthMessenger</h1>
              <p className="text-sm text-muted-foreground">Business</p>
            </div>
            <Avatar className="h-12 w-12">
              <AvatarImage src={logo} alt="User" />
              <AvatarFallback><User className="h-6 w-6" /></AvatarFallback>
            </Avatar>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-lg bg-muted/50"
            />
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="px-4 py-4 border-b border-border">
        <h2 className="text-lg font-bold mb-3">Category</h2>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="all" className="rounded-lg py-3">All</TabsTrigger>
            <TabsTrigger value="doctor" className="rounded-lg py-3">Doctors</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Healthcare Providers */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-bold mb-4">Healthcare Providers</h2>
        
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading providers...</div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No providers found</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {filteredProviders.slice(0, 6).map((provider) => (
              <div
                key={provider.id}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <Avatar className="h-24 w-24">
                  <AvatarImage src="" alt={provider.business_name} />
                  <AvatarFallback className={`${getSpecialtyColor(provider.specializations[0]?.name || '')} text-white text-xl`}>
                    {getProviderInitials(provider.business_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-semibold text-sm line-clamp-1">
                    {provider.business_name.split(' - ')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {provider.specializations[0]?.name || 'Healthcare'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-bold mb-4">Services</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-medium">Consultation</span>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <Pill className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-medium">Medicine</span>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-medium">Diagnostics</span>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <Ambulance className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-medium">Ambulance</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="flex items-center justify-around py-2">
          <button className="flex flex-col items-center gap-1 px-6 py-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-primary">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 px-6 py-2">
            <Phone className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Appointments</span>
          </button>
          <button className="flex flex-col items-center gap-1 px-6 py-2">
            <Activity className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Analytics</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AlliedHealthcare;
