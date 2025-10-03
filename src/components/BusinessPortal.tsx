import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Calendar, BarChart3, User, Stethoscope, Building2,
  Pill, TestTube, Ambulance, Users, Clock, TrendingUp
} from 'lucide-react';

interface ServiceProvider {
  id: string;
  business_name: string;
  description: string;
  rating: number;
  total_reviews: number;
}

const BusinessPortal = () => {
  const [selectedCategory, setSelectedCategory] = useState('doctors');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadProviders();
      }
    });
  }, [navigate]);

  const loadProviders = async () => {
    const { data, error } = await supabase
      .from('service_providers')
      .select('*')
      .order('rating', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Error loading providers:', error);
      return;
    }

    setProviders(data || []);
  };

  const services = [
    {
      icon: Stethoscope,
      title: 'Consultation',
      iconColor: 'bg-blue-500'
    },
    {
      icon: Pill,
      title: 'Medicine',
      iconColor: 'bg-blue-500'
    },
    {
      icon: TestTube,
      title: 'Diagnostics',
      iconColor: 'bg-blue-500'
    },
    {
      icon: Ambulance,
      title: 'Ambulance',
      iconColor: 'bg-blue-500'
    }
  ];

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Header */}
      <div className="p-4 backdrop-blur-glass bg-gradient-glass border-b border-glass-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">HealthMessenger</h1>
              <p className="text-sm text-muted-foreground">Business</p>
            </div>
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-10 rounded-full bg-background/50 border-glass-border"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Category Tabs */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-3">Category</h2>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="doctors">Doctors</TabsTrigger>
                <TabsTrigger value="pharmacies">Pharmacies</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Healthcare Providers */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-3">Healthcare Providers</h2>
            <div className="grid grid-cols-2 gap-4">
              {providers.map((provider) => (
                <Card
                  key={provider.id}
                  className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border hover:shadow-elevated transition-all cursor-pointer"
                  onClick={() => navigate('/booking')}
                >
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl mb-3 flex items-center justify-center">
                    <Stethoscope className="h-12 w-12 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{provider.business_name}</h3>
                  <p className="text-sm text-muted-foreground">{provider.description || 'General Physician'}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-3">Services</h2>
            <div className="grid grid-cols-2 gap-4">
              {services.map((service) => (
                <Card
                  key={service.title}
                  className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border hover:shadow-elevated transition-all cursor-pointer"
                  onClick={() => {
                    toast({
                      title: service.title,
                      description: 'Service details coming soon'
                    });
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full ${service.iconColor} flex items-center justify-center`}>
                      <service.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">{service.title}</h3>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Navigation */}
      <nav className="backdrop-blur-glass bg-gradient-glass border-t border-glass-border">
        <div className="flex justify-around items-center h-16 px-4 max-w-4xl mx-auto">
          <button className="flex flex-col items-center gap-1 text-primary">
            <Building2 className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground">
            <Calendar className="w-6 h-6" />
            <span className="text-xs">Appointments</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground">
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs">Analytics</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default BusinessPortal;
