import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Stethoscope, 
  AlertTriangle, 
  Heart, 
  ShoppingBag, 
  Briefcase,
  Phone,
  Video,
  MapPin,
  Clock,
  DollarSign,
  Pill,
  Star,
  Users,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/SEOHead';
import { Breadcrumbs, CrossModuleNav, RelatedContent } from '@/components/navigation';
import { ShareDeepLink } from '@/components/sharing';

interface LiveStats {
  totalProviders: number;
  totalDoctors: number;
  totalClinics: number;
  avgRating: number;
  totalConsultations: number;
}

export default function CareAccess() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [topProviders, setTopProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveStats();
    fetchTopProviders();
  }, []);

  const fetchLiveStats = async () => {
    try {
      const { data, error } = await supabase
        .from('chatr_healthcare')
        .select('provider_type, rating_average, rating_count')
        .eq('is_active', true);

      if (error) throw error;

      if (data) {
        const doctors = data.filter(p => p.provider_type === 'doctor').length;
        const clinics = data.filter(p => p.provider_type === 'clinic').length;
        const avgRating = data.reduce((acc, p) => acc + (p.rating_average || 0), 0) / data.length;
        const totalConsultations = data.reduce((acc, p) => acc + (p.rating_count || 0), 0);

        setStats({
          totalProviders: data.length,
          totalDoctors: doctors,
          totalClinics: clinics,
          avgRating: parseFloat(avgRating.toFixed(1)),
          totalConsultations
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('chatr_healthcare')
        .select('*')
        .eq('is_active', true)
        .order('rating_average', { ascending: false })
        .limit(4);

      if (error) throw error;
      setTopProviders(data || []);
    } catch (error) {
      console.error('Error fetching top providers:', error);
    }
  };

  const careServices = [
    {
      icon: MapPin,
      title: 'Find Nearby',
      description: 'Healthcare providers near you',
      route: '/local-healthcare',
      color: 'from-blue-500 to-blue-600',
      badge: 'Live',
      count: stats?.totalProviders
    },
    {
      icon: Stethoscope,
      title: 'Book Doctor',
      description: 'Schedule appointments',
      route: '/local-healthcare',
      color: 'from-green-500 to-green-600',
      badge: null,
      count: stats?.totalDoctors
    },
    {
      icon: Video,
      title: 'Teleconsultation',
      description: 'Video/audio consultation',
      route: '/teleconsultation',
      color: 'from-purple-500 to-purple-600',
      badge: 'New'
    },
    {
      icon: AlertTriangle,
      title: 'Emergency',
      description: 'Quick emergency access',
      route: '/emergency-services',
      color: 'from-red-500 to-red-600',
      badge: null
    },
    {
      icon: Heart,
      title: 'Allied Healthcare',
      description: 'Specialized services',
      route: '/allied-healthcare',
      color: 'from-indigo-500 to-indigo-600',
      badge: null
    },
    {
      icon: Pill,
      title: 'Pharmacy',
      description: 'Order medicines',
      route: '/marketplace',
      color: 'from-teal-500 to-emerald-600',
      badge: null
    }
  ];

  const quickActions = [
    { icon: Phone, label: 'Call Doctor', action: () => navigate('/local-healthcare') },
    { icon: Video, label: 'Video Call', action: () => navigate('/teleconsultation') },
    { icon: MapPin, label: 'Find Nearby', action: () => navigate('/local-healthcare') },
    { icon: Clock, label: 'Appointments', action: () => navigate('/local-healthcare') }
  ];

  return (
    <>
      <SEOHead
        title="Care Access - Healthcare Ecosystem | Chatr"
        description="Find doctors, book appointments, access teleconsultation, and manage your healthcare journey. Complete healthcare ecosystem at your fingertips."
        keywords="healthcare, doctors, teleconsultation, appointments, emergency services, pharmacy"
        breadcrumbList={[
          { name: 'Home', url: '/' },
          { name: 'Care Access', url: '/care' }
        ]}
      />
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <img src={logo} alt="Chatr" className="h-6 cursor-pointer" onClick={() => navigate('/')} />
            <div className="flex items-center gap-2">
              <ShareDeepLink path="/care" title="Chatr Care Access" />
              <Button variant="ghost" size="sm" className="text-white h-8 text-xs" onClick={() => navigate('/')}>
                Back
              </Button>
            </div>
          </div>
          <h1 className="text-lg font-bold mb-1">Care Access</h1>
          <p className="text-xs text-blue-100">Complete healthcare ecosystem</p>
        </div>

        {/* Live Stats */}
        {loading ? (
          <div className="grid grid-cols-4 gap-2 px-3 pb-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 bg-white/20" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-4 gap-2 px-3 pb-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{stats.totalProviders}</p>
              <p className="text-[10px] text-blue-100">Providers</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{stats.totalDoctors}</p>
              <p className="text-[10px] text-blue-100">Doctors</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{stats.avgRating}★</p>
              <p className="text-[10px] text-blue-100">Avg Rating</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{stats.totalConsultations.toLocaleString()}</p>
              <p className="text-[10px] text-blue-100">Reviews</p>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-16 flex-col gap-1 text-xs"
                  onClick={action.action}
                >
                  <action.icon className="w-5 h-5" />
                  <span>{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Care Services Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {careServices.map((service) => (
            <Card 
              key={service.title}
              className="cursor-pointer hover:shadow-lg transition-all group"
              onClick={() => navigate(service.route)}
            >
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-3`}>
                  <service.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{service.title}</h3>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </div>
                  {service.badge && (
                    <Badge className={service.badge === 'Live' ? 'bg-green-500' : 'bg-purple-500'} variant="secondary">
                      {service.badge}
                    </Badge>
                  )}
                </div>
                {service.count !== undefined && (
                  <p className="text-xs text-primary mt-2 font-medium">{service.count} available</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Rated Providers */}
        {topProviders.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Top Rated Providers
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/local-healthcare')}>
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {topProviders.map((provider) => (
                <div 
                  key={provider.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate('/local-healthcare')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {provider.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{provider.name}</h4>
                        {provider.is_verified && (
                          <CheckCircle className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{provider.specialty}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-sm">{provider.rating_average?.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">₹{provider.consultation_fee}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Provider Portal */}
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="w-4 h-4 text-teal-600" />
              Healthcare Provider Portal
            </CardTitle>
            <CardDescription className="text-xs">
              Join our network of healthcare professionals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => navigate('/provider-register')}>
              Register as Provider
            </Button>
          </CardContent>
        </Card>

        {/* Health Wallet */}
        <Card 
          className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => navigate('/health-wallet')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4 text-purple-600" />
              Health Wallet
              <Badge className="ml-2 bg-green-600 text-[10px]">Live</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Track expenses, insurance, and rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              Open Wallet
            </Button>
          </CardContent>
        </Card>
        
        {/* Cross-Module Navigation */}
        <CrossModuleNav variant="footer" />
        
        {/* Related Content */}
        <RelatedContent />
      </div>
      
      <Breadcrumbs />
    </div>
    </>
  );
}
