import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, CreditCard, Wallet, Truck, Package, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface CheckoutData {
  items: CartItem[];
  total: number;
}

export default function MarketplaceCheckout() {
  const navigate = useNavigate();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    pincode: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');

  useEffect(() => {
    const stored = sessionStorage.getItem('marketplace-checkout');
    if (stored) {
      setCheckoutData(JSON.parse(stored));
    } else {
      navigate('/marketplace');
    }
  }, [navigate]);

  const handlePlaceOrder = async () => {
    if (!address.name || !address.phone || !address.line1 || !address.city || !address.pincode) {
      toast.error('Please fill in all address fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to place order');
        navigate('/auth');
        return;
      }

      // Store order in localStorage for tracking (would be DB in production)
      const orderId = `MPO-${Date.now()}`;
      const existingOrders = JSON.parse(localStorage.getItem('chatr-marketplace-orders') || '[]');
      existingOrders.push({
        id: orderId,
        userId: user.id,
        items: checkoutData?.items,
        total: checkoutData?.total,
        address,
        paymentMethod,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('chatr-marketplace-orders', JSON.stringify(existingOrders));

      // Clear cart
      localStorage.removeItem('chatr-marketplace-cart');
      sessionStorage.removeItem('marketplace-checkout');

      toast.success('Order placed successfully!', {
        description: 'You will receive a confirmation shortly'
      });

      navigate('/marketplace/order-success');
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!checkoutData) {
    return null;
  }

  const deliveryFee = checkoutData.total >= 499 ? 0 : 49;
  const finalTotal = checkoutData.total + deliveryFee;

  return (
    <>
      <SEOHead
        title="Checkout - Marketplace | Chatr"
        description="Complete your order"
      />
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Checkout</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Summary ({checkoutData.items.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checkoutData.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    placeholder="10-digit mobile"
                  />
                </div>
              </div>
              <div>
                <Label>Address Line 1</Label>
                <Input
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  placeholder="House/Flat No., Building Name"
                />
              </div>
              <div>
                <Label>Address Line 2 (Optional)</Label>
                <Input
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  placeholder="Street, Landmark"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label>PIN Code</Label>
                  <Input
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    placeholder="6-digit PIN"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod" className="flex-1 cursor-pointer">
                    <span className="font-medium">Cash on Delivery</span>
                    <p className="text-xs text-muted-foreground">Pay when you receive</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="wallet" id="wallet" />
                  <Label htmlFor="wallet" className="flex-1 cursor-pointer flex items-center gap-2">
                    <span className="font-medium">ChatrPay Wallet</span>
                    <Badge variant="secondary" className="text-xs">5% Cashback</Badge>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="upi" id="upi" />
                  <Label htmlFor="upi" className="flex-1 cursor-pointer">
                    <span className="font-medium">UPI Payment</span>
                    <p className="text-xs text-muted-foreground">GPay, PhonePe, Paytm</p>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Price Breakdown */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Item Total</span>
                <span>₹{checkoutData.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                {deliveryFee === 0 ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  <span>₹{deliveryFee}</span>
                )}
              </div>
              {deliveryFee === 0 && (
                <p className="text-xs text-green-600">Free delivery on orders above ₹499</p>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{finalTotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Truck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Estimated Delivery</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Tomorrow by 6 PM
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Place Order Button */}
          <Button
            className="w-full h-14 text-lg"
            onClick={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? 'Placing Order...' : `Place Order • ₹${finalTotal.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </>
  );
}