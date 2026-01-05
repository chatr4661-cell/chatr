import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, CreditCard, Wallet, Banknote, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function FoodCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCart();
    loadRestaurant();
    loadUserAddress();
  }, [id]);

  const loadCart = () => {
    const savedCart = localStorage.getItem(`food_cart_${id}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const loadRestaurant = async () => {
    const { data } = await supabase
      .from('food_vendors')
      .select('*')
      .eq('id', id)
      .single();
    if (data) setRestaurant(data);
  };

  const loadUserAddress = async () => {
    // Just leave address empty, user will fill it
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 500 ? 0 : 40;
  const platformFee = 5;
  const gstCharges = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + platformFee + gstCharges;

  const placeOrder = async () => {
    if (!address.trim()) {
      toast({ title: "Address required", description: "Please enter delivery address", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please login", variant: "destructive" });
        navigate('/auth');
        return;
      }

      const { data: order, error } = await supabase
        .from('food_orders')
        .insert({
          user_id: user.id,
          vendor_id: id,
          items: cart as any,
          total_amount: total,
          delivery_address: address,
          payment_method: paymentMethod,
          status: 'pending',
          order_status: 'pending',
          delivery_charge: deliveryFee,
          subtotal: subtotal,
          taxes: gstCharges
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (error) throw error;

      localStorage.removeItem(`food_cart_${id}`);
      toast({ title: "Order placed!", description: "Your order has been confirmed" });
      navigate(`/order-tracking/${order.id}`);
    } catch (error) {
      console.error('Order error:', error);
      toast({ title: "Order failed", description: "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const removeItem = (itemId: string) => {
    const newCart = cart.filter(c => c.id !== itemId);
    localStorage.setItem(`food_cart_${id}`, JSON.stringify(newCart));
    setCart(newCart);
    if (newCart.length === 0) navigate(`/restaurant/${id}`);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Your cart is empty</p>
        <Button onClick={() => navigate('/food-ordering')}>Browse Restaurants</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Checkout</h1>
            <p className="text-xs text-muted-foreground">{restaurant?.restaurant_name}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Delivery Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter full delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="text-sm"
            />
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Your Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium">₹{item.price * item.quantity}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Promo Code */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">Apply</Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-3 p-3 rounded-lg border">
                <RadioGroupItem value="cod" id="cod" />
                <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer">
                  <Banknote className="h-4 w-4" />
                  Cash on Delivery
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border mt-2">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer">
                  <Wallet className="h-4 w-4" />
                  UPI / Wallet
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border mt-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  Credit / Debit Card
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Bill Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Bill Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Total</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className={deliveryFee === 0 ? "text-green-500" : ""}>
                {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span>₹{platformFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST & Charges</span>
              <span>₹{gstCharges}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-base">
              <span>To Pay</span>
              <span>₹{total}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <Clock className="h-4 w-4" />
          <span>Estimated delivery: {restaurant?.delivery_time || '30-40'} mins</span>
        </div>
      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-bottom">
        <Button
          className="w-full h-14 text-lg"
          onClick={placeOrder}
          disabled={loading}
        >
          {loading ? "Placing Order..." : `Pay ₹${total}`}
        </Button>
      </div>
    </div>
  );
}
