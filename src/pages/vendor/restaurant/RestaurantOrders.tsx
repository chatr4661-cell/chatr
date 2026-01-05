import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Clock, Check, X, Phone, MapPin,
  ChefHat, Bike, Package, AlertCircle, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface FoodOrder {
  id: string;
  order_number: string | null;
  items: any;
  total_amount: number;
  order_status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  delivery_address: any;
  delivery_instructions: string | null;
  created_at: string;
  customer_rating: number | null;
  customer_review: string | null;
}

const ORDER_STATUSES = [
  { value: 'placed', label: 'New', icon: AlertCircle, color: 'bg-yellow-500' },
  { value: 'confirmed', label: 'Confirmed', icon: Check, color: 'bg-blue-500' },
  { value: 'preparing', label: 'Preparing', icon: ChefHat, color: 'bg-orange-500' },
  { value: 'ready', label: 'Ready', icon: Package, color: 'bg-green-500' },
  { value: 'out_for_delivery', label: 'Out for Delivery', icon: Bike, color: 'bg-purple-500' },
  { value: 'delivered', label: 'Delivered', icon: Check, color: 'bg-green-600' },
  { value: 'cancelled', label: 'Cancelled', icon: X, color: 'bg-red-500' },
];

export default function RestaurantOrders() {
  const navigate = useNavigate();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState<FoodOrder | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (!vendorId) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel('food_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_orders',
          filter: `vendor_id=eq.${vendorId}`,
        },
        (payload) => {
          console.log('Order update:', payload);
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId]);

  const loadOrders = async () => {
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

      const { data: ordersData, error } = await supabase
        .from('food_orders')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('food_orders')
        .update({ 
          order_status: newStatus,
          ...(newStatus === 'delivered' && { actual_delivery_time: new Date().toISOString() })
        })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => 
        prev.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o)
      );
      toast.success(`Order ${newStatus}`);
      setSelectedOrder(null);
    } catch (error: any) {
      toast.error('Failed to update order');
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder) return;

    try {
      const { error } = await supabase
        .from('food_orders')
        .update({ 
          order_status: 'cancelled',
          cancelled_by: 'vendor',
          cancellation_reason: rejectReason,
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      setOrders(prev => 
        prev.map(o => o.id === selectedOrder.id ? { ...o, order_status: 'cancelled' } : o)
      );
      toast.success('Order rejected');
      setShowRejectDialog(false);
      setSelectedOrder(null);
      setRejectReason('');
    } catch (error: any) {
      toast.error('Failed to reject order');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status);
    if (!statusConfig) return null;

    return (
      <Badge className={`${statusConfig.color} text-white`}>
        <statusConfig.icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = ['placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    const currentIndex = statusFlow.indexOf(currentStatus);
    return currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;
  };

  const activeOrders = orders.filter(o => 
    !['delivered', 'cancelled'].includes(o.order_status)
  );
  const pastOrders = orders.filter(o => 
    ['delivered', 'cancelled'].includes(o.order_status)
  );

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
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => navigate('/vendor/dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Orders</h1>
              <p className="text-sm opacity-80">{activeOrders.length} active orders</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={loadOrders}
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 p-1 m-4 max-w-[calc(100%-2rem)]">
          <TabsTrigger value="active" className="relative">
            Active
            {activeOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="px-4 space-y-3">
          <AnimatePresence>
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No active orders</p>
              </div>
            ) : (
              activeOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{order.order_number || `#${order.id.slice(0, 8)}`}</h3>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'dd MMM, hh:mm a')}
                          </p>
                        </div>
                        {getStatusBadge(order.order_status)}
                      </div>

                      <div className="space-y-1 text-sm mb-3">
                        {(order.items as any[])?.slice(0, 3).map((item, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-muted-foreground">
                              {item.quantity}x {item.name}
                            </span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                        {(order.items as any[])?.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{(order.items as any[]).length - 3} more items
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                            {order.payment_method === 'cod' ? 'COD' : 'Prepaid'}
                          </Badge>
                        </div>
                        <span className="font-bold">₹{order.total_amount}</span>
                      </div>

                      {order.order_status === 'placed' && (
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, 'confirmed');
                            }}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                              setShowRejectDialog(true);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {getNextStatus(order.order_status) && order.order_status !== 'placed' && (
                        <Button 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextStatus = getNextStatus(order.order_status);
                            if (nextStatus) updateOrderStatus(order.id, nextStatus);
                          }}
                        >
                          Mark as {ORDER_STATUSES.find(s => s.value === getNextStatus(order.order_status))?.label}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="past" className="px-4 space-y-3">
          {pastOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No past orders</p>
            </div>
          ) : (
            pastOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{order.order_number || `#${order.id.slice(0, 8)}`}</h3>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                    {getStatusBadge(order.order_status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {(order.items as any[])?.length} items
                    </span>
                    <span className="font-bold">₹{order.total_amount}</span>
                  </div>
                  {order.customer_rating && (
                    <div className="mt-2 flex items-center gap-1 text-yellow-500">
                      {'★'.repeat(order.customer_rating)}{'☆'.repeat(5 - order.customer_rating)}
                      <span className="text-sm text-muted-foreground ml-2">
                        {order.customer_review || 'No review'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder && !showRejectDialog} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number || `#${selectedOrder?.id.slice(0, 8)}`}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedOrder.order_status)}
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedOrder.created_at), 'dd MMM, hh:mm a')}
                </span>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Order Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(selectedOrder.items as any[])?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>₹{selectedOrder.total_amount}</span>
                  </div>
                </CardContent>
              </Card>

              {selectedOrder.delivery_address && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Delivery Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedOrder.delivery_address.address}</p>
                    {selectedOrder.delivery_instructions && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Note: {selectedOrder.delivery_instructions}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between">
                <Badge variant={selectedOrder.payment_status === 'paid' ? 'default' : 'secondary'}>
                  {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {selectedOrder?.order_status === 'placed' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                >
                  Reject Order
                </Button>
                <Button onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}>
                  Accept Order
                </Button>
              </>
            )}
            {getNextStatus(selectedOrder?.order_status || '') && selectedOrder?.order_status !== 'placed' && (
              <Button 
                className="w-full sm:w-auto"
                onClick={() => {
                  const nextStatus = getNextStatus(selectedOrder?.order_status || '');
                  if (nextStatus) updateOrderStatus(selectedOrder!.id, nextStatus);
                }}
              >
                Mark as {ORDER_STATUSES.find(s => s.value === getNextStatus(selectedOrder?.order_status || ''))?.label}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Reason for rejection (optional)"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectOrder}>Reject Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
