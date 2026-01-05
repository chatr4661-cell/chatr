import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Store, UtensilsCrossed, Tag, Stethoscope, 
  Package, TrendingUp, Bell, Settings, 
  LogOut, ChevronRight, Plus, IndianRupee,
  ShoppingBag, Users, Star, Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface Vendor {
  id: string;
  vendor_type: 'restaurant' | 'deal_merchant' | 'healthcare_provider';
  business_name: string;
  logo_url: string | null;
  is_verified: boolean;
  verification_status: string;
  rating: number;
  total_orders: number;
  total_revenue: number;
  commission_rate: number;
}

interface Stats {
  todayOrders: number;
  pendingOrders: number;
  todayRevenue: number;
  activeDeals: number;
}

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stats, setStats] = useState<Stats>({ todayOrders: 0, pendingOrders: 0, todayRevenue: 0, activeDeals: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendorData();
  }, []);

  const loadVendorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/vendor/login');
        return;
      }

      const { data: vendorData, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !vendorData) {
        navigate('/vendor/register');
        return;
      }

      setVendor(vendorData as Vendor);

      // Load notifications
      const { data: notifData } = await supabase
        .from('vendor_notifications')
        .select('*')
        .eq('vendor_id', vendorData.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      setNotifications(notifData || []);

      // Load stats based on vendor type
      if (vendorData.vendor_type === 'restaurant') {
        const today = new Date().toISOString().split('T')[0];
        const { data: ordersToday } = await supabase
          .from('food_orders')
          .select('id, total_amount, order_status')
          .eq('vendor_id', vendorData.id)
          .gte('created_at', today);

        setStats({
          todayOrders: ordersToday?.length || 0,
          pendingOrders: ordersToday?.filter(o => o.order_status === 'placed' || o.order_status === 'preparing').length || 0,
          todayRevenue: ordersToday?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
          activeDeals: 0
        });
      } else if (vendorData.vendor_type === 'deal_merchant') {
        const { data: deals } = await supabase
          .from('merchant_deals')
          .select('id')
          .eq('vendor_id', vendorData.id)
          .eq('is_active', true);

        setStats({
          todayOrders: 0,
          pendingOrders: 0,
          todayRevenue: 0,
          activeDeals: deals?.length || 0
        });
      }
    } catch (error) {
      console.error('Error loading vendor data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getVendorTypeIcon = () => {
    switch (vendor?.vendor_type) {
      case 'restaurant': return <UtensilsCrossed className="w-5 h-5" />;
      case 'deal_merchant': return <Tag className="w-5 h-5" />;
      case 'healthcare_provider': return <Stethoscope className="w-5 h-5" />;
      default: return <Store className="w-5 h-5" />;
    }
  };

  const getVendorTypeName = () => {
    switch (vendor?.vendor_type) {
      case 'restaurant': return 'Restaurant Partner';
      case 'deal_merchant': return 'Deals Merchant';
      case 'healthcare_provider': return 'Healthcare Provider';
      default: return 'Vendor';
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/vendor/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!vendor) return null;

  const quickActions = vendor.vendor_type === 'restaurant' ? [
    { icon: Package, label: 'Orders', route: '/vendor/orders', count: stats.pendingOrders },
    { icon: UtensilsCrossed, label: 'Menu', route: '/vendor/menu' },
    { icon: TrendingUp, label: 'Analytics', route: '/vendor/analytics' },
    { icon: Settings, label: 'Settings', route: '/vendor/settings' },
  ] : vendor.vendor_type === 'deal_merchant' ? [
    { icon: Tag, label: 'My Deals', route: '/vendor/deals', count: stats.activeDeals },
    { icon: Plus, label: 'Create Deal', route: '/vendor/deals/new' },
    { icon: Users, label: 'Redemptions', route: '/vendor/redemptions' },
    { icon: Settings, label: 'Settings', route: '/vendor/settings' },
  ] : [
    { icon: Stethoscope, label: 'Appointments', route: '/vendor/appointments' },
    { icon: Users, label: 'Patients', route: '/vendor/patients' },
    { icon: TrendingUp, label: 'Analytics', route: '/vendor/analytics' },
    { icon: Settings, label: 'Settings', route: '/vendor/settings' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-white/20">
              <AvatarImage src={vendor.logo_url || ''} />
              <AvatarFallback className="bg-white/20 text-white">
                {vendor.business_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold text-lg">{vendor.business_name}</h1>
              <div className="flex items-center gap-2 text-sm opacity-80">
                {getVendorTypeIcon()}
                <span>{getVendorTypeName()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 relative"
              onClick={() => navigate('/vendor/notifications')}
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Verification Status */}
        {!vendor.is_verified && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-3 mb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Verification {vendor.verification_status}</span>
              </div>
              <Badge variant="outline" className="border-yellow-400/50 text-yellow-200">
                Pending
              </Badge>
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          {vendor.vendor_type === 'restaurant' && (
            <>
              <Card className="bg-white/10 border-0 backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                    <ShoppingBag className="w-3 h-3" />
                    Today's Orders
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.todayOrders}</p>
                  {stats.pendingOrders > 0 && (
                    <p className="text-xs text-yellow-300">{stats.pendingOrders} pending</p>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-0 backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                    <IndianRupee className="w-3 h-3" />
                    Today's Revenue
                  </div>
                  <p className="text-2xl font-bold text-white">₹{stats.todayRevenue.toLocaleString()}</p>
                </CardContent>
              </Card>
            </>
          )}
          {vendor.vendor_type === 'deal_merchant' && (
            <>
              <Card className="bg-white/10 border-0 backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                    <Tag className="w-3 h-3" />
                    Active Deals
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.activeDeals}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-0 backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                    <Users className="w-3 h-3" />
                    Total Redemptions
                  </div>
                  <p className="text-2xl font-bold text-white">{vendor.total_orders}</p>
                </CardContent>
              </Card>
            </>
          )}
          <Card className="bg-white/10 border-0 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                <Star className="w-3 h-3" />
                Rating
              </div>
              <p className="text-2xl font-bold text-white">{vendor.rating || 'New'}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-0 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                <IndianRupee className="w-3 h-3" />
                Total Earnings
              </div>
              <p className="text-2xl font-bold text-white">₹{(vendor.total_revenue || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        <h2 className="font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all relative"
                onClick={() => navigate(action.route)}
              >
                <CardContent className="p-3 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <action.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-center">{action.label}</span>
                  {action.count !== undefined && action.count > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0">
                      {action.count}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Notifications</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendor/notifications')}>
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((notif) => (
              <Card key={notif.id} className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{notif.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Settlement Summary */}
      <div className="p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Settlement Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Total Earnings</span>
              <span className="font-semibold">₹{(vendor.total_revenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Platform Commission ({vendor.commission_rate || 10}%)</span>
              <span className="font-semibold text-red-500">-₹{((vendor.total_revenue || 0) * 0.1).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Net Earnings</span>
              <span className="font-bold text-green-600">₹{((vendor.total_revenue || 0) * 0.9).toLocaleString()}</span>
            </div>
            <Button className="w-full mt-3" variant="outline" onClick={() => navigate('/vendor/settlements')}>
              View Settlement History
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
