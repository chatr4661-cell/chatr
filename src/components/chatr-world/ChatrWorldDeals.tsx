import { useState, useEffect } from 'react';
import { Search, Tag, Clock, MapPin, Percent, Copy, CheckCircle, Loader2, Sparkles, Gift, Zap, ArrowRight, TrendingUp, Star, ShoppingBag, Utensils, Plane, Heart, Briefcase, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Deal {
  id: string;
  title: string;
  description: string;
  category: string;
  original_price: number;
  deal_price: number;
  discount_percent: number;
  coupon_code: string;
  image_url: string;
  terms_conditions: string;
  location: string;
  expires_at: string;
  current_redemptions: number;
  max_redemptions: number;
}

interface ChatrWorldDealsProps {
  location?: { lat: number; lon: number; city?: string } | null;
}

const categories = [
  { id: 'All', name: 'All Deals', icon: Sparkles, color: 'from-violet-500 to-purple-500' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  { id: 'food', name: 'Food', icon: Utensils, color: 'from-orange-500 to-amber-500' },
  { id: 'travel', name: 'Travel', icon: Plane, color: 'from-blue-500 to-cyan-500' },
  { id: 'healthcare', name: 'Healthcare', icon: Heart, color: 'from-red-500 to-pink-500' },
  { id: 'jobs', name: 'Jobs', icon: Briefcase, color: 'from-green-500 to-emerald-500' },
  { id: 'services', name: 'Services', icon: Home, color: 'from-teal-500 to-cyan-500' },
];

export function ChatrWorldDeals({ location }: ChatrWorldDealsProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchDeals();
  }, [category]);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chatr_deals')
        .select('*')
        .eq('is_active', true)
        .order('discount_percent', { ascending: false });

      if (category !== 'All') {
        query = query.eq('category', category);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Coupon code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return { text: 'Expired', urgent: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return { text: `${days}d ${hours}h left`, urgent: days < 2 };
    if (hours > 0) return { text: `${hours}h ${minutes}m left`, urgent: true };
    return { text: `${minutes}m left`, urgent: true };
  };

  const filteredDeals = deals.filter(deal =>
    deal.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (cat: string) => {
    const found = categories.find(c => c.id === cat);
    return found?.icon || Tag;
  };

  const getCategoryColor = (cat: string) => {
    const found = categories.find(c => c.id === cat);
    return found?.color || 'from-gray-500 to-slate-500';
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner - CashKaro Style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        <div className="relative z-10 text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <Zap className="h-6 w-6" />
            </div>
            <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400">
              MEGA SALE LIVE
            </Badge>
          </div>
          <h2 className="text-3xl font-black mb-2">Extra ₹500 Cashback</h2>
          <p className="text-white/80 text-sm mb-4">Use code <span className="font-mono bg-white/20 px-2 py-0.5 rounded">CHATR500</span></p>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
              <Gift className="h-4 w-4" />
              <span className="text-sm">500+ Active Deals</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Up to 80% OFF</span>
            </div>
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-4 right-4 text-6xl opacity-20">💰</div>
        <div className="absolute bottom-4 right-8 text-4xl opacity-20">🎁</div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              category === cat.id 
                ? `bg-gradient-to-r ${cat.color} text-white shadow-lg` 
                : 'bg-muted hover:bg-accent'
            }`}
          >
            <cat.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search deals, stores, offers..."
          className="pl-12 h-12 rounded-xl"
        />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <p className="text-2xl font-bold text-green-600">₹2.5L+</p>
          <p className="text-xs text-muted-foreground">Saved Today</p>
        </Card>
        <Card className="p-3 text-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
          <p className="text-2xl font-bold text-blue-600">10K+</p>
          <p className="text-xs text-muted-foreground">Active Users</p>
        </Card>
        <Card className="p-3 text-center bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 dark:border-purple-800">
          <p className="text-2xl font-bold text-purple-600">500+</p>
          <p className="text-xs text-muted-foreground">Live Deals</p>
        </Card>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Deals Grid */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDeals.map(deal => {
            const timeInfo = deal.expires_at ? getTimeRemaining(deal.expires_at) : null;
            const redemptionPercent = deal.max_redemptions 
              ? ((deal.current_redemptions || 0) / deal.max_redemptions) * 100 
              : 0;
            const CategoryIcon = getCategoryIcon(deal.category);
            
            return (
              <Card key={deal.id} className="overflow-hidden hover:shadow-xl transition-all group border-0 shadow-md">
                {/* Deal Header */}
                <div className={`relative h-36 bg-gradient-to-br ${getCategoryColor(deal.category)} p-4`}>
                  {deal.image_url && (
                    <img src={deal.image_url} alt={deal.title} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30" />
                  )}
                  
                  {/* Discount Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <Badge className="bg-white text-foreground font-bold text-lg px-3 py-1 shadow-lg">
                      {deal.discount_percent}% OFF
                    </Badge>
                  </div>
                  
                  {/* Timer */}
                  {timeInfo && (
                    <Badge 
                      className={`absolute top-3 right-3 ${
                        timeInfo.urgent 
                          ? 'bg-red-500 animate-pulse' 
                          : 'bg-black/50'
                      }`}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {timeInfo.text}
                    </Badge>
                  )}
                  
                  {/* Category Icon */}
                  <div className="absolute bottom-3 left-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <CategoryIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div className="absolute bottom-3 right-3 text-white text-right">
                    <p className="text-xs line-through opacity-70">₹{deal.original_price}</p>
                    <p className="text-2xl font-black">₹{deal.deal_price}</p>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Title */}
                  <div>
                    <h3 className="font-bold line-clamp-2 group-hover:text-primary transition-colors">
                      {deal.title}
                    </h3>
                    {deal.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{deal.description}</p>
                    )}
                  </div>

                  {/* Location */}
                  {deal.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {deal.location}
                    </p>
                  )}

                  {/* Redemption Progress */}
                  {deal.max_redemptions && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {deal.max_redemptions - (deal.current_redemptions || 0)} left
                        </span>
                        <span className="text-orange-500 font-medium">
                          {Math.round(redemptionPercent)}% claimed
                        </span>
                      </div>
                      <Progress value={redemptionPercent} className="h-2" />
                    </div>
                  )}

                  {/* Coupon Code */}
                  {deal.coupon_code && (
                    <Button
                      variant="outline"
                      className="w-full justify-between border-dashed border-2 border-orange-300 bg-orange-50 dark:bg-orange-950 hover:bg-orange-100 dark:hover:bg-orange-900"
                      onClick={() => copyCode(deal.coupon_code)}
                    >
                      <span className="font-mono font-bold text-orange-600">{deal.coupon_code}</span>
                      {copiedCode === deal.coupon_code ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-orange-500" />
                      )}
                    </Button>
                  )}

                  {/* CTA */}
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                    Get This Deal
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredDeals.length === 0 && (
        <div className="text-center py-12">
          <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center mb-4">
            <Tag className="h-12 w-12 text-orange-500" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No deals found</h3>
          <p className="text-sm text-muted-foreground mb-4">Check back later for amazing offers!</p>
          <Button variant="outline" onClick={() => setCategory('All')}>
            Browse All Deals
          </Button>
        </div>
      )}
    </div>
  );
}
