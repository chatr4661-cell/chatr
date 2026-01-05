import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, ChevronRight, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Order {
  id: string;
  status: string;
  order_status: string | null;
  items: any;
  total_amount: number;
  delivery_address: string;
  created_at: string;
  vendor_id: string;
}

interface VendorMap {
  [key: string]: { name: string; avatar_url?: string | null };
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<VendorMap>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: ordersData } = await supabase
        .from('food_orders')
        .select('id, status, order_status, items, total_amount, delivery_address, created_at, vendor_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData as Order[]);
        
        // Load vendor info
        const vendorIds = [...new Set(ordersData.map(o => o.vendor_id))];
        if (vendorIds.length > 0) {
          const { data: vendorsData } = await supabase
            .from('food_vendors')
            .select('id, name, avatar_url')
            .in('id', vendorIds);
          
          if (vendorsData) {
            const vendorMap: VendorMap = {};
            vendorsData.forEach(v => {
              vendorMap[v.id] = { name: v.name, avatar_url: v.avatar_url };
            });
            setVendors(vendorMap);
          }
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      preparing: { variant: 'default', label: 'Preparing' },
      ready: { variant: 'default', label: 'Ready' },
      out_for_delivery: { variant: 'default', label: 'On the Way' },
      delivered: { variant: 'outline', label: 'Delivered' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    };
    const orderStatus = status || 'pending';
    const config = statusConfig[orderStatus] || { variant: 'secondary', label: orderStatus };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.order_status || o.status));
  const pastOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.order_status || o.status));

  const renderOrderCard = (order: Order) => {
    const vendor = vendors[order.vendor_id];
    const items = order.items as any[];
    const itemNames = items.map(i => `${i.quantity}x ${i.name}`).join(', ');

    return (
      <Card 
        key={order.id} 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => navigate(`/order-tracking/${order.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
              {vendor?.avatar_url ? (
                <img src={vendor.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" />
              ) : (
                <Package className="h-6 w-6 text-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-sm">{vendor?.name || 'Restaurant'}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{itemNames}</p>
                </div>
                {getStatusBadge(order.status)}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(order.created_at), 'dd MMM, h:mm a')}
                  </span>
                  <span>₹{order.total_amount}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/food-ordering')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">My Orders</h1>
        </div>
      </div>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="active" className="relative">
              Active
              {activeOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {activeOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past">Past Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {activeOrders.length > 0 ? (
              activeOrders.map(renderOrderCard)
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No active orders</p>
                <Button className="mt-4" onClick={() => navigate('/food-ordering')}>
                  Order Now
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {pastOrders.length > 0 ? (
              pastOrders.map(order => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-sm">
                              {vendors[order.vendor_id]?.name || 'Restaurant'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.created_at), 'dd MMM yyyy')} • ₹{order.total_amount}
                            </p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/restaurant/${order.vendor_id}`);
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reorder
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/order-tracking/${order.id}`);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No past orders</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
