import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, MapPin, Check, Clock, ChefHat, Bike, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface Order {
  id: string;
  status: string;
  order_status: string | null;
  items: any;
  total_amount: number;
  delivery_address: string;
  created_at: string;
  vendor_id: string;
  estimated_delivery_time: string | null;
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Package, description: 'Your order has been received' },
  { key: 'confirmed', label: 'Confirmed', icon: Check, description: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Your food is being prepared' },
  { key: 'ready', label: 'Ready', icon: Clock, description: 'Order ready for pickup' },
  { key: 'out_for_delivery', label: 'On the Way', icon: Bike, description: 'Delivery partner on route' },
  { key: 'delivered', label: 'Delivered', icon: MapPin, description: 'Order delivered successfully' }
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'food_orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        setOrder(prev => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const { data: orderData } = await supabase
        .from('food_orders')
        .select('id, status, order_status, items, total_amount, delivery_address, created_at, vendor_id, estimated_delivery_time')
        .eq('id', orderId)
        .single();

      if (orderData) {
        setOrder(orderData as Order);
        
        const { data: vendorData } = await supabase
          .from('food_vendors')
          .select('*')
          .eq('id', orderData.vendor_id)
          .single();
        
        if (vendorData) setRestaurant(vendorData);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    const index = statusSteps.findIndex(s => s.key === order.status);
    return index >= 0 ? index : 0;
  };

  const getEstimatedTime = () => {
    if (!order) return '';
    const orderTime = new Date(order.created_at);
    const deliveryMins = parseInt(restaurant?.delivery_time?.split('-')[1] || '40');
    const estimatedTime = new Date(orderTime.getTime() + deliveryMins * 60000);
    return estimatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Order not found</p>
        <Button onClick={() => navigate('/food-ordering')}>Browse Restaurants</Button>
      </div>
    );
  }

  const currentStep = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/order-history')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Order #{order.id.slice(0, 8)}</h1>
              <p className="text-xs text-muted-foreground">{restaurant?.restaurant_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Estimated Time */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Estimated Delivery</p>
              <p className="text-3xl font-bold text-primary">{getEstimatedTime()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {restaurant?.delivery_time || '30-40'} mins from order
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status Timeline */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {statusSteps.map((step, index) => {
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;
                const StepIcon = step.icon;

                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        } ${isCurrent ? 'ring-4 ring-primary/20 animate-pulse' : ''}`}
                      >
                        <StepIcon className="h-5 w-5" />
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div
                          className={`w-0.5 h-8 ${
                            isCompleted ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`font-medium ${isCompleted ? '' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Delivery Address</p>
                <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Order Summary</h3>
            <div className="space-y-2">
              {(order.items as any[]).map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}x {item.name}
                  </span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                <span>Total</span>
                <span>₹{order.total_amount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {order.status === 'delivered' && (
          <div className="space-y-2">
            <Button className="w-full" onClick={() => navigate(`/restaurant/${order.vendor_id}`)}>
              Reorder
            </Button>
            <Button variant="outline" className="w-full">
              Rate & Review
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
