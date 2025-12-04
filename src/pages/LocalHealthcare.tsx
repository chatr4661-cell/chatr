import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Star, Phone, Clock, Calendar, CheckCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UPIPaymentModal } from '@/components/payment/UPIPaymentModal';
import { SEOHead } from '@/components/SEOHead';
import { Breadcrumbs, CrossModuleNav } from '@/components/navigation';
import { ShareDeepLink } from '@/components/sharing';

interface HealthcareProvider {
  id: string;
  name: string;
  provider_type: string;
  specialty: string;
  description?: string;
  address: string;
  city: string;
  phone?: string;
  consultation_fee?: number;
  opening_time?: string;
  closing_time?: string;
  rating_average: number;
  rating_count: number;
  is_verified: boolean;
  is_active: boolean;
}

export default function LocalHealthcare() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<HealthcareProvider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<HealthcareProvider | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [stats, setStats] = useState({ total: 0, doctors: 0, clinics: 0, avgRating: 0 });

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, selectedType, searchQuery]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chatr_healthcare')
        .select('*')
        .eq('is_active', true)
        .order('rating_average', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setProviders(data);
        
        const doctors = data.filter(p => p.provider_type === 'doctor').length;
        const clinics = data.filter(p => p.provider_type === 'clinic').length;
        const avgRating = data.reduce((acc, p) => acc + (p.rating_average || 0), 0) / data.length;
        
        setStats({
          total: data.length,
          doctors,
          clinics,
          avgRating: parseFloat(avgRating.toFixed(1))
        });
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load healthcare providers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = () => {
    let filtered = [...providers];

    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.provider_type === selectedType || p.specialty?.toLowerCase().includes(selectedType));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.specialty?.toLowerCase().includes(query) ||
        p.city?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredProviders(filtered);
  };

  const handleBooking = (provider: HealthcareProvider) => {
    setSelectedProvider(provider);
    setBookingOpen(true);
  };

  const confirmBooking = async (paymentId?: string) => {
    if (!selectedProvider) return;
    
    toast({
      title: 'Appointment Requested!',
      description: paymentId 
        ? `Payment submitted! Your appointment with ${selectedProvider.name} will be confirmed once verified.`
        : `Your appointment request with ${selectedProvider.name} has been sent.`,
    });
    setBookingOpen(false);
    setSelectedProvider(null);
    setShowPayment(false);
  };

  return (
    <>
      <SEOHead
        title="Local Healthcare - Find Doctors & Clinics | Chatr"
        description="Find verified doctors, clinics, and healthcare providers near you. Book appointments instantly and get quality healthcare."
        keywords="doctors near me, clinics, healthcare providers, book appointment, local healthcare"
        breadcrumbList={[
          { name: 'Home', url: '/' },
          { name: 'Care Access', url: '/care' },
          { name: 'Local Healthcare', url: '/local-healthcare' }
        ]}
      />
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Healthcare Providers
              </h1>
              <p className="text-sm text-blue-100">{stats.total} verified providers</p>
            </div>
          </div>
          <ShareDeepLink path="/local-healthcare" title="Find Healthcare Providers" />
        </div>

        <div className="grid grid-cols-4 gap-2 px-4 pb-4">
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{stats.total}</p>
            <p className="text-xs text-blue-100">Total</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{stats.doctors}</p>
            <p className="text-xs text-blue-100">Doctors</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{stats.clinics}</p>
            <p className="text-xs text-blue-100">Clinics</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{stats.avgRating}★</p>
            <p className="text-xs text-blue-100">Rating</p>
          </div>
        </div>
      </div>

      <Breadcrumbs />
      
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search doctors, clinics, specialties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="doctor">Doctors</TabsTrigger>
            <TabsTrigger value="clinic">Clinics</TabsTrigger>
            <TabsTrigger value="dentist">Dental</TabsTrigger>
            <TabsTrigger value="eye">Eye</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">No providers found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProviders.map(provider => (
              <Card key={provider.id} className="p-4 hover:shadow-lg transition-all border-l-4 border-l-blue-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      {provider.is_verified && (
                        <Badge className="bg-blue-500 text-white text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-primary font-medium">{provider.specialty}</p>
                    <p className="text-xs text-muted-foreground capitalize">{provider.provider_type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-sm bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{provider.rating_average?.toFixed(1)}</span>
                      <span className="text-muted-foreground text-xs">({provider.rating_count})</span>
                    </div>
                    {provider.consultation_fee && (
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold">
                        ₹{provider.consultation_fee}
                      </Badge>
                    )}
                  </div>
                </div>

                {provider.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{provider.description}</p>
                )}

                {(provider.opening_time || provider.closing_time) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Clock className="h-4 w-4" />
                    <span>{provider.opening_time?.slice(0,5)} - {provider.closing_time?.slice(0,5)}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{provider.address}, {provider.city}</span>
                </div>

                <div className="flex items-center gap-2">
                  {provider.phone && (
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <a href={`tel:${provider.phone}`}>
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </a>
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleBooking(provider)}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Book Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>Request an appointment with {selectedProvider?.name}</DialogDescription>
          </DialogHeader>
          
          {selectedProvider && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold">{selectedProvider.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedProvider.specialty}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">₹{selectedProvider.consultation_fee || 500}</Badge>
                  <Badge variant="secondary">
                    <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                    {selectedProvider.rating_average}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12">
                  <Calendar className="h-4 w-4 mr-2" />
                  Today
                </Button>
                <Button variant="outline" className="h-12">
                  <Calendar className="h-4 w-4 mr-2" />
                  Tomorrow
                </Button>
              </div>

              <Button onClick={() => {
                const amount = selectedProvider?.consultation_fee || 500;
                setPaymentAmount(amount);
                setBookingOpen(false);
                setTimeout(() => setShowPayment(true), 100);
              }} className="w-full h-12 bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Pay & Confirm Booking
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* UPI Payment Modal */}
      <UPIPaymentModal
        open={showPayment}
        onOpenChange={setShowPayment}
        amount={paymentAmount || 500}
        orderType="healthcare"
        onPaymentSubmitted={(paymentId) => {
          confirmBooking(paymentId);
          setPaymentAmount(0);
        }}
      />
      
      {/* Cross-Module Navigation */}
      <div className="p-4">
        <CrossModuleNav variant="footer" />
      </div>
    </div>
    </>
  );
}
