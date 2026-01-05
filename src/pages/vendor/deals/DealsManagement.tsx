import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Search, Edit2, Trash2, 
  MoreVertical, Tag, Calendar, Users, Eye,
  EyeOff, Percent, Clock, Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

interface Deal {
  id: string;
  title: string;
  description: string;
  original_price: number;
  deal_price: number;
  discount_percent: number;
  image_url: string | null;
  category: string;
  terms_conditions: string;
  max_redemptions: number | null;
  current_redemptions: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  is_featured: boolean;
  coupon_code: string | null;
}

export default function DealsManagement() {
  const navigate = useNavigate();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [newDeal, setNewDeal] = useState({
    title: '',
    description: '',
    original_price: '',
    deal_price: '',
    category: '',
    terms_conditions: '',
    max_redemptions: '',
    valid_days: '30',
    coupon_code: '',
  });

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/vendor/login');
        return;
      }

      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!vendor) {
        navigate('/vendor/register');
        return;
      }

      setVendorId(vendor.id);

      const { data: dealsData } = await supabase
        .from('merchant_deals')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      setDeals(dealsData || []);
    } catch (error) {
      console.error('Error loading deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeal = async () => {
    if (!newDeal.title.trim() || !newDeal.original_price || !newDeal.deal_price || !vendorId) return;

    const originalPrice = parseFloat(newDeal.original_price);
    const dealPrice = parseFloat(newDeal.deal_price);
    const discountPercent = Math.round(((originalPrice - dealPrice) / originalPrice) * 100);

    try {
      const { error } = await supabase
        .from('merchant_deals')
        .insert({
          vendor_id: vendorId,
          title: newDeal.title.trim(),
          description: newDeal.description.trim(),
          original_price: originalPrice,
          deal_price: dealPrice,
          discount_percent: discountPercent,
          category: newDeal.category.trim(),
          terms_conditions: newDeal.terms_conditions.trim(),
          max_redemptions: newDeal.max_redemptions ? parseInt(newDeal.max_redemptions) : null,
          valid_from: new Date().toISOString(),
          valid_until: addDays(new Date(), parseInt(newDeal.valid_days)).toISOString(),
          coupon_code: newDeal.coupon_code.trim() || null,
        });

      if (error) throw error;

      toast.success('Deal created successfully');
      setShowAddDeal(false);
      setNewDeal({
        title: '',
        description: '',
        original_price: '',
        deal_price: '',
        category: '',
        terms_conditions: '',
        max_redemptions: '',
        valid_days: '30',
        coupon_code: '',
      });
      loadDeals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create deal');
    }
  };

  const toggleDealActive = async (deal: Deal) => {
    try {
      const { error } = await supabase
        .from('merchant_deals')
        .update({ is_active: !deal.is_active })
        .eq('id', deal.id);

      if (error) throw error;

      setDeals(prev => 
        prev.map(d => d.id === deal.id ? { ...d, is_active: !d.is_active } : d)
      );
      toast.success(deal.is_active ? 'Deal deactivated' : 'Deal activated');
    } catch (error: any) {
      toast.error('Failed to update deal');
    }
  };

  const deleteDeal = async (dealId: string) => {
    try {
      const { error } = await supabase
        .from('merchant_deals')
        .delete()
        .eq('id', dealId);

      if (error) throw error;

      setDeals(prev => prev.filter(d => d.id !== dealId));
      toast.success('Deal deleted');
    } catch (error: any) {
      toast.error('Failed to delete deal');
    }
  };

  const filteredDeals = deals.filter(deal => 
    deal.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDeals = filteredDeals.filter(d => d.is_active);
  const expiredDeals = filteredDeals.filter(d => !d.is_active || new Date(d.valid_until) < new Date());

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-500 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/vendor/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">My Deals</h1>
            <p className="text-sm opacity-80">{activeDeals.length} active deals</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input 
            placeholder="Search deals..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Add Deal Button */}
      <div className="p-4">
        <Button 
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
          onClick={() => setShowAddDeal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Deal
        </Button>
      </div>

      {/* Stats */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-4">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{activeDeals.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {deals.reduce((sum, d) => sum + d.current_redemptions, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Redemptions</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {Math.max(...deals.map(d => d.discount_percent), 0)}%
            </p>
            <p className="text-xs text-muted-foreground">Max Discount</p>
          </CardContent>
        </Card>
      </div>

      {/* Deals List */}
      <div className="px-4 space-y-3">
        <AnimatePresence>
          {filteredDeals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No deals found</p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => setShowAddDeal(true)}
              >
                Create your first deal
              </Button>
            </div>
          ) : (
            filteredDeals.map((deal, index) => (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={!deal.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Deal Image */}
                      <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {deal.image_url ? (
                          <img 
                            src={deal.image_url} 
                            alt={deal.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <span className="text-3xl font-bold text-purple-600">{deal.discount_percent}%</span>
                            <p className="text-xs text-purple-500">OFF</p>
                          </div>
                        )}
                      </div>

                      {/* Deal Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-sm line-clamp-1">{deal.title}</h3>
                            {deal.category && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                {deal.category}
                              </Badge>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingDeal(deal)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleDealActive(deal)}>
                                {deal.is_active ? (
                                  <>
                                    <EyeOff className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-500"
                                onClick={() => deleteDeal(deal.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-lg font-bold text-green-600">₹{deal.deal_price}</span>
                          <span className="text-sm text-muted-foreground line-through">₹{deal.original_price}</span>
                          <Badge className="bg-green-500">{deal.discount_percent}% OFF</Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {deal.current_redemptions}{deal.max_redemptions ? `/${deal.max_redemptions}` : ''} claimed
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expires {format(new Date(deal.valid_until), 'dd MMM')}
                          </div>
                        </div>

                        {deal.coupon_code && (
                          <div className="mt-2 bg-muted/50 rounded px-2 py-1 inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <span className="text-xs font-mono">{deal.coupon_code}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add Deal Dialog */}
      <Dialog open={showAddDeal} onOpenChange={setShowAddDeal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="dealTitle">Deal Title *</Label>
              <Input 
                id="dealTitle"
                placeholder="e.g., 50% off on Spa Services"
                className="mt-1"
                value={newDeal.title}
                onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="dealDesc">Description</Label>
              <Textarea 
                id="dealDesc"
                placeholder="Describe your deal..."
                className="mt-1"
                rows={2}
                value={newDeal.description}
                onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="originalPrice">Original Price (₹) *</Label>
                <Input 
                  id="originalPrice"
                  type="number"
                  placeholder="1000"
                  className="mt-1"
                  value={newDeal.original_price}
                  onChange={(e) => setNewDeal({ ...newDeal, original_price: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dealPrice">Deal Price (₹) *</Label>
                <Input 
                  id="dealPrice"
                  type="number"
                  placeholder="500"
                  className="mt-1"
                  value={newDeal.deal_price}
                  onChange={(e) => setNewDeal({ ...newDeal, deal_price: e.target.value })}
                />
              </div>
            </div>

            {newDeal.original_price && newDeal.deal_price && (
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-2xl font-bold text-green-600">
                  {Math.round(((parseFloat(newDeal.original_price) - parseFloat(newDeal.deal_price)) / parseFloat(newDeal.original_price)) * 100)}% OFF
                </span>
              </div>
            )}

            <div>
              <Label htmlFor="category">Category</Label>
              <Input 
                id="category"
                placeholder="e.g., Spa, Salon, Fitness"
                className="mt-1"
                value={newDeal.category}
                onChange={(e) => setNewDeal({ ...newDeal, category: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxRedemptions">Max Redemptions</Label>
                <Input 
                  id="maxRedemptions"
                  type="number"
                  placeholder="Unlimited"
                  className="mt-1"
                  value={newDeal.max_redemptions}
                  onChange={(e) => setNewDeal({ ...newDeal, max_redemptions: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="validDays">Valid for (days)</Label>
                <Input 
                  id="validDays"
                  type="number"
                  placeholder="30"
                  className="mt-1"
                  value={newDeal.valid_days}
                  onChange={(e) => setNewDeal({ ...newDeal, valid_days: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="couponCode">Coupon Code (optional)</Label>
              <Input 
                id="couponCode"
                placeholder="e.g., SAVE50"
                className="mt-1 uppercase"
                value={newDeal.coupon_code}
                onChange={(e) => setNewDeal({ ...newDeal, coupon_code: e.target.value.toUpperCase() })}
              />
            </div>

            <div>
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea 
                id="terms"
                placeholder="Any terms and conditions..."
                className="mt-1"
                rows={2}
                value={newDeal.terms_conditions}
                onChange={(e) => setNewDeal({ ...newDeal, terms_conditions: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDeal(false)}>Cancel</Button>
            <Button onClick={handleAddDeal}>Create Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
