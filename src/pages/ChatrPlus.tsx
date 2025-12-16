import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Search, 
  Sparkles, 
  UtensilsCrossed, 
  Wrench, 
  Stethoscope, 
  Briefcase,
  GraduationCap,
  Store,
  Wallet,
  Crown,
  TrendingUp,
  MapPin,
  Star,
  ArrowRight,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function ChatrPlus() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['chatr-plus-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatr_plus_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch featured services (only from approved sellers)
  const { data: featuredServices } = useQuery({
    queryKey: ['chatr-plus-featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatr_plus_services')
        .select(`
          *,
          seller:chatr_plus_sellers!inner(business_name, logo_url, city, rating_average, approval_status, is_verified),
          category:chatr_plus_categories(name, slug)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .eq('seller.approval_status', 'approved')
        .limit(6);
      
      if (error) throw error;
      return data;
    }
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/chatr-plus/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const categoryIcons: Record<string, any> = {
    'UtensilsCrossed': UtensilsCrossed,
    'Wrench': Wrench,
    'Stethoscope': Stethoscope,
    'Sparkles': Sparkles,
    'Briefcase': Briefcase,
    'GraduationCap': GraduationCap,
    'Store': Store
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background pt-16 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full"
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">AI-Powered Super App</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent"
          >
            Chatr+
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            One app for everything — Find. Book. Pay. Earn.
          </motion.p>

          {/* AI Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative max-w-2xl mx-auto"
          >
            <div className="relative flex items-center gap-2 bg-background rounded-full shadow-lg p-2">
              <Sparkles className="w-5 h-5 text-primary ml-4" />
              <Input
                type="text"
                placeholder="Find a dentist, order biryani, hire a plumber..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-lg"
              />
              <Button
                onClick={handleSearch}
                size="lg"
                className="rounded-full"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Powered by AI • Real-time local results • GPS-based discovery
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-8 pt-6"
          >
            <div className="text-center">
              <div className="text-2xl font-bold">10K+</div>
              <div className="text-sm text-muted-foreground">Services</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">5K+</div>
              <div className="text-sm text-muted-foreground">Sellers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">50K+</div>
              <div className="text-sm text-muted-foreground">Users</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Subscription Banner */}
      <div className="px-4 -mt-8 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/30 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-amber-500 p-3 rounded-xl">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Chatr+ Premium</h3>
                  <p className="text-muted-foreground mb-2">Unlimited access to all services for just ₹99/month</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Unlimited bookings</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>AI recommendations</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wallet className="w-4 h-4 text-amber-500" />
                      <span>Cashback rewards</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => navigate('/chatr-plus/subscribe')}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                Subscribe Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Categories */}
      <div className="px-4 mb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Browse Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categories?.map((category, index) => {
              const Icon = categoryIcons[category.icon_name as string] || Store;
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="p-6 text-center cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                    onClick={() => navigate(`/chatr-plus/category/${category.slug}`)}
                  >
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-${category.color_scheme}-500/20 flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 text-${category.color_scheme}-600`} />
                    </div>
                    <h3 className="font-medium text-sm">{category.name}</h3>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Featured Services */}
      {featuredServices && featuredServices.length > 0 && (
        <div className="px-4 mb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Featured Services</h2>
              <Button variant="ghost" onClick={() => navigate('/chatr-plus/search')}>
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredServices.map((service: any, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-all overflow-hidden"
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
                        <h3 className="font-semibold text-lg">{service.service_name}</h3>
                        <Badge className="bg-primary/10 text-primary">Featured</Badge>
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
                        <span className="text-sm font-medium">{service.seller?.business_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-medium">
                              {service.seller?.rating_average || '4.5'}
                            </span>
                          </div>
                          {service.seller?.city && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">{service.seller.city}</span>
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
          </div>
        </div>
      )}

      {/* Become a Seller CTA */}
      <div className="px-4 mb-12">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border-blue-500/30 p-8">
            <div className="flex items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">Become a Chatr+ Seller</h3>
                <p className="text-muted-foreground mb-4">
                  Start earning by offering your services. Join 5,000+ sellers on India's fastest-growing platform.
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span>Grow your business</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-500" />
                    <span>Plans from ₹99/month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <span>AI-powered leads</span>
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => navigate('/chatr-plus/seller-registration')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                Register Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
