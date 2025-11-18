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
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    const { data } = await supabase
      .from('local_deals')
      .select('*')
      .eq('is_active', true)
      .gte('valid_until', new Date().toISOString())
      .order('discount_percentage', { ascending: false });

    setDeals(data || []);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-green-500/5 to-background pb-20">
      <div className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Local Deals</h1>
            <p className="text-xs text-muted-foreground">Save with exclusive offers</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {deals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground space-y-2">
                <p className="text-lg font-semibold">No deals available</p>
                <p className="text-sm">Check back soon for exclusive local offers!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          deals.map((deal) => (
            <Card key={deal.id} className="overflow-hidden">
              {deal.image_url && (
                <img src={deal.image_url} alt={deal.title} className="w-full h-48 object-cover" />
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{deal.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{deal.description}</p>
                    
                    <div className="flex items-center gap-2 mt-3">
                      {deal.location && (
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="w-3 h-3" />
                          {deal.location}
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeRemaining(deal.valid_until)} left
                      </Badge>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                      <div className="text-center">
                        <Percent className="w-5 h-5 mx-auto" />
                        <div className="text-xl font-bold leading-none">{deal.discount_percentage}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div>
                    <div className="text-sm text-muted-foreground line-through">₹{deal.original_price}</div>
                    <div className="text-2xl font-bold text-primary">₹{deal.discounted_price}</div>
                    <div className="text-xs text-muted-foreground">{deal.discounted_price} Chatr Coins</div>
                  </div>
                  <Button onClick={() => handleRedeem(deal)}>
                    <QrCodeIcon className="w-4 h-4 mr-2" />
                    Redeem
                  </Button>
                </div>

                {deal.max_redemptions && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{deal.current_redemptions} redeemed</span>
                      <span>{deal.max_redemptions} available</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{ width: `${(deal.current_redemptions / deal.max_redemptions) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
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
