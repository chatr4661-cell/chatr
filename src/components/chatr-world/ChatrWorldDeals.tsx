import { useState, useEffect } from 'react';
import { Search, Tag, Clock, MapPin, Percent, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const dealCategories = ['All', 'jobs', 'healthcare', 'food', 'services', 'shopping', 'travel', 'entertainment'];

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
        .gt('expires_at', new Date().toISOString())
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

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const filteredDeals = deals.filter(deal =>
    deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      jobs: 'from-green-500 to-emerald-500',
      healthcare: 'from-red-500 to-pink-500',
      food: 'from-orange-500 to-amber-500',
      services: 'from-blue-500 to-cyan-500',
      shopping: 'from-purple-500 to-violet-500',
      travel: 'from-teal-500 to-cyan-500',
      entertainment: 'from-pink-500 to-rose-500',
    };
    return colors[cat] || 'from-gray-500 to-slate-500';
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals..."
            className="pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {dealCategories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Deals Grid */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDeals.map(deal => (
            <Card key={deal.id} className="hover:shadow-lg transition-all overflow-hidden group">
              <div className={`h-32 bg-gradient-to-br ${getCategoryColor(deal.category)} relative`}>
                {deal.image_url ? (
                  <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover mix-blend-overlay" />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="text-4xl font-bold">{deal.discount_percent}%</p>
                    <p className="text-sm">OFF</p>
                  </div>
                </div>
                <Badge className="absolute top-2 left-2 bg-black/50">
                  {deal.category}
                </Badge>
                {deal.expires_at && (
                  <Badge variant="destructive" className="absolute top-2 right-2">
                    <Clock className="h-3 w-3 mr-1" />
                    {getTimeRemaining(deal.expires_at)}
                  </Badge>
                )}
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-lg line-clamp-2">{deal.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {deal.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>
                )}

                {/* Price */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-600">₹{deal.deal_price}</span>
                  {deal.original_price && (
                    <span className="text-lg text-muted-foreground line-through">₹{deal.original_price}</span>
                  )}
                </div>

                {/* Location */}
                {deal.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {deal.location}
                  </p>
                )}

                {/* Redemptions */}
                {deal.max_redemptions && (
                  <p className="text-xs text-muted-foreground">
                    {deal.max_redemptions - (deal.current_redemptions || 0)} remaining
                  </p>
                )}

                {/* Coupon Code */}
                {deal.coupon_code && (
                  <Button
                    variant="outline"
                    className="w-full justify-between border-dashed border-2"
                    onClick={() => copyCode(deal.coupon_code)}
                  >
                    <span className="font-mono font-bold">{deal.coupon_code}</span>
                    {copiedCode === deal.coupon_code ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}

                {/* Terms */}
                {deal.terms_conditions && (
                  <p className="text-xs text-muted-foreground">
                    T&C: {deal.terms_conditions}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredDeals.length === 0 && (
        <div className="text-center py-12">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No deals found</h3>
          <p className="text-sm text-muted-foreground">Check back later for amazing offers!</p>
        </div>
      )}
    </div>
  );
}