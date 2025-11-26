import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Sparkles, Scissors, Wrench, Zap, Paintbrush, Wind, MapPin, Clock, Percent, QrCode as QrCodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useLocation } from '@/contexts/LocationContext';

const serviceCategories = [
  { name: "Women's Salon & Spa", icon: Sparkles, badge: 'Sale' },
  { name: "Men's Salon & Massage", icon: Scissors },
  { name: "Cleaning & Pest Control", icon: Sparkles },
  { name: "Electrician, Plumber & Carpenter", icon: Wrench },
  { name: "Painting & Waterproofing", icon: Paintbrush },
  { name: "Native Water Purifier", icon: Zap },
  { name: "AC & Appliance Repair", icon: Wind },
  { name: "Wall makeover by Revamp", icon: Paintbrush },
];

export default function LocalDeals() {
  const navigate = useNavigate();
  const { location, isLoading: locationLoading, error: locationError } = useLocation();
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (location?.latitude && location?.longitude) {
      loadDeals();
    }
  }, [location?.latitude, location?.longitude]);

  const loadDeals = async () => {
    if (!location?.latitude || !location?.longitude) {
      console.warn('No location available for deals');
      return;
    }

    try {
      // TODO: Add distance calculation for nearby deals
      const { data } = await supabase
        .from('local_deals')
        .select('*')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('discount_percentage', { ascending: false });

      setDeals(data || []);
      
      if (data && data.length === 0) {
        toast.info('No deals found in your area yet');
      }
    } catch (error) {
      console.error('Error loading deals:', error);
      toast.error('Failed to load deals');
    }
  };

  const handleRedeem = async (deal: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check user points
      const { data: points } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!points || points.balance < deal.discounted_price) {
        toast.error('Insufficient Chatr Coins');
        return;
      }

      // Process payment
      const { data: payment, error: paymentError } = await supabase.rpc('process_coin_payment', {
        p_user_id: user.id,
        p_amount: deal.discounted_price,
        p_merchant_id: null,
        p_payment_type: 'service',
        p_description: `Deal: ${deal.title}`
      });

      if (paymentError) throw paymentError;

      // Generate QR code
      const qrCodeValue = `DEAL-${deal.id}-${user.id}-${Date.now()}`;

      // Create redemption
      const { error: redemptionError } = await supabase
        .from('deal_redemptions')
        .insert({
          deal_id: deal.id,
          user_id: user.id,
          qr_code: qrCodeValue
        });

      if (redemptionError) throw redemptionError;

      // Update deal redemptions count
      await supabase
        .from('local_deals')
        .update({ current_redemptions: (deal.current_redemptions || 0) + 1 })
        .eq('id', deal.id);

      setQrCode(qrCodeValue);
      setSelectedDeal(deal);
      setShowQR(true);
      toast.success('Deal redeemed! Show QR code at store 🎉');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to redeem deal');
    }
  };

  const getTimeRemaining = (validUntil: string) => {
    const now = new Date();
    const end = new Date(validUntil);
    const hours = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60));
    return hours > 24 ? `${Math.floor(hours / 24)} days` : `${hours} hours`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Chatr Services</h1>
            <p className="text-xs text-muted-foreground">Home services at your doorstep</p>
          </div>
          {location?.city && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{location.city}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Location Status */}
        {locationLoading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Detecting your location for nearby deals...</p>
            </CardContent>
          </Card>
        ) : !location ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">Enable location to find deals near you</p>
              <p className="text-xs text-muted-foreground">{locationError || 'Grant location permission in your browser'}</p>
            </CardContent>
          </Card>
        ) : null}
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search for services"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Service Categories Grid */}
        <div>
          <h2 className="text-lg font-bold mb-4">Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {serviceCategories.map((category, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <category.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold line-clamp-2">{category.name}</p>
                      {category.badge && (
                        <Badge variant="secondary" className="mt-1 text-xs">{category.badge}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Offers & Discounts Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Offers & discounts</h2>
            {deals.length > 0 && (
              <Button variant="ghost" size="sm">View all</Button>
            )}
          </div>
          
          {deals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground space-y-2">
                  <p className="text-lg font-semibold">No deals available</p>
                  <p className="text-sm">Check back soon for exclusive offers!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {deals.map((deal) => (
                <Card key={deal.id} className="flex-shrink-0 w-80 overflow-hidden">
                  {deal.image_url && (
                    <img src={deal.image_url} alt={deal.title} className="w-full h-40 object-cover" />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-bold line-clamp-1">{deal.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{deal.description}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          {deal.location && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <MapPin className="w-3 h-3" />
                              {deal.location}
                            </Badge>
                          )}
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            {getTimeRemaining(deal.valid_until)} left
                          </Badge>
                        </div>
                      </div>

                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white flex-shrink-0">
                        <div className="text-center">
                          <Percent className="w-4 h-4 mx-auto" />
                          <div className="text-lg font-bold leading-none">{deal.discount_percentage}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground line-through">₹{deal.original_price}</div>
                        <div className="text-lg font-bold text-primary">₹{deal.discounted_price}</div>
                        <div className="text-xs text-muted-foreground">{deal.discounted_price} Coins</div>
                      </div>
                      <Button size="sm" onClick={() => handleRedeem(deal)}>
                        <QrCodeIcon className="w-4 h-4 mr-1" />
                        Redeem
                      </Button>
                    </div>

                    {deal.max_redemptions && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{deal.current_redemptions} redeemed</span>
                          <span>{deal.max_redemptions} available</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                            style={{ width: `${(deal.current_redemptions / deal.max_redemptions) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deal Details Dialog */}
      <Dialog open={selectedDeal && !showQR} onOpenChange={(open) => !open && setSelectedDeal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDeal?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDeal?.image_url && (
              <img src={selectedDeal.image_url} alt={selectedDeal.title} className="w-full h-48 object-cover rounded-lg" />
            )}
            <p className="text-muted-foreground">{selectedDeal?.description}</p>
            
            <div className="flex items-center justify-between py-4 border-y">
              <div>
                <div className="text-sm text-muted-foreground line-through">₹{selectedDeal?.original_price}</div>
                <div className="text-2xl font-bold text-primary">₹{selectedDeal?.discounted_price}</div>
                <div className="text-xs text-muted-foreground">{selectedDeal?.discounted_price} Chatr Coins</div>
              </div>
              <Badge variant="secondary" className="text-2xl font-bold px-4 py-2">
                {selectedDeal?.discount_percentage}% OFF
              </Badge>
            </div>

            {selectedDeal?.location && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedDeal.location}</Badge>
                {selectedDeal?.valid_until && (
                  <Badge variant="outline">
                    {getTimeRemaining(selectedDeal.valid_until)} left
                  </Badge>
                )}
              </div>
            )}

            {selectedDeal?.max_redemptions && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{selectedDeal.current_redemptions} redeemed</span>
                  <span>{selectedDeal.max_redemptions} available</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    style={{ width: `${(selectedDeal.current_redemptions / selectedDeal.max_redemptions) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <Button 
              className="w-full" 
              size="lg"
              onClick={() => handleRedeem(selectedDeal)}
            >
              Redeem with {selectedDeal?.discounted_price} Coins
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deal Redeemed!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">Show this QR code at the store to claim your deal</p>
            {qrCode && (
              <div className="bg-white p-4 rounded-lg inline-block">
                <QRCodeSVG value={qrCode} size={200} />
              </div>
            )}
            {selectedDeal && (
              <div className="text-left bg-muted p-4 rounded-lg">
                <h4 className="font-semibold">{selectedDeal.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{selectedDeal.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{selectedDeal.location}</Badge>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
