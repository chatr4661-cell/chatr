import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Store, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Star, 
  Users,
  Package,
  BarChart3,
  Settings,
  Bell,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/chatr-logo.png';
import { useSellerRealtimeNotifications } from '@/hooks/useSellerRealtimeNotifications';
import { SellerNotificationBell } from '@/components/seller/SellerNotificationBell';

interface SellerProfile {
  id: string;
  business_name: string;
  business_type: string;
  description: string;
  logo_url: string | null;
  email: string;
  phone_number: string;
  rating_average: number;
  rating_count: number;
  total_bookings: number;
  subscription_plan: string;
  is_verified: boolean;
  is_active: boolean;
}

interface DashboardStats {
  totalBookings: number;
  activeServices: number;
  totalEarnings: number;
  averageRating: number;
  pendingBookings: number;
  completedBookings: number;
  monthlyRevenue: number;
  newReviews: number;
}

export default function SellerPortal() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const { notificationCount, notifications, clearNotifications, markAsRead } = 
    useSellerRealtimeNotifications(seller?.id);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeServices: 0,
    totalEarnings: 0,
    averageRating: 0,
    pendingBookings: 0,
    completedBookings: 0,
    monthlyRevenue: 0,
    newReviews: 0,
  });

  useEffect(() => {
    loadSellerData();
  }, []);

  const loadSellerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from('chatr_plus_sellers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (sellerError) {
        if (sellerError.code === 'PGRST116') {
          // No seller profile found
          navigate('/chatr-plus/seller-registration');
          return;
        }
        throw sellerError;
      }

      setSeller(sellerData);

      // Load services count
      const { count: servicesCount } = await supabase
        .from('chatr_plus_services')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerData.id)
        .eq('is_active', true);

      // Load bookings stats
      const { data: bookings } = await supabase
        .from('chatr_plus_bookings')
        .select('status, total_amount')
        .eq('seller_id', sellerData.id);

      const totalBookings = bookings?.length || 0;
      const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
      
      const totalEarnings = bookings
        ?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

      // Calculate monthly revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentBookings } = await supabase
        .from('chatr_plus_bookings')
        .select('total_amount, created_at')
        .eq('seller_id', sellerData.id)
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const monthlyRevenue = recentBookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

      // Load recent reviews count
      const { count: reviewsCount } = await supabase
        .from('chatr_plus_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerData.id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      setStats({
        totalBookings,
        activeServices: servicesCount || 0,
        totalEarnings,
        averageRating: sellerData.rating_average || 0,
        pendingBookings,
        completedBookings,
        monthlyRevenue,
        newReviews: reviewsCount || 0,
      });

    } catch (error) {
      console.error('Error loading seller data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load seller dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading seller portal...</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Seller Profile Found</h2>
          <p className="text-muted-foreground mb-4">
            You need to register as a seller to access this portal
          </p>
          <Button onClick={() => navigate('/chatr-plus/seller-registration')}>
            Register as Seller
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Chatr" className="h-8" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold">Seller Portal</h1>
                <p className="text-sm text-muted-foreground">{seller.business_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {seller.is_verified && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              <Badge variant={seller.subscription_plan === 'premium' ? 'default' : 'outline'}>
                {seller.subscription_plan}
              </Badge>
              <SellerNotificationBell
                count={notificationCount}
                notifications={notifications}
                onClear={clearNotifications}
                onMarkAsRead={markAsRead}
              />
              <Button variant="ghost" size="icon" onClick={() => navigate('/chatr-plus/seller/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">₹{stats.totalEarnings.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">
                  +₹{stats.monthlyRevenue.toLocaleString()} this month
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pendingBookings} pending
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Services</p>
                <p className="text-2xl font-bold">{stats.activeServices}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Published & live
                </p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {stats.averageRating.toFixed(1)}
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.newReviews} new this month
                </p>
              </div>
              <Star className="h-8 w-8 text-primary" />
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Activity */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => navigate('/chatr-plus/seller/services')}
                  >
                    <Package className="h-6 w-6" />
                    <span className="text-sm">Add Service</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => navigate('/chatr-plus/seller/bookings')}
                  >
                    <Calendar className="h-6 w-6" />
                    <span className="text-sm">View Bookings</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => navigate('/chatr-plus/seller/analytics')}
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span className="text-sm">Analytics</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => navigate('/chatr-plus/seller/messages')}
                  >
                    <MessageSquare className="h-6 w-6" />
                    <span className="text-sm">Messages</span>
                  </Button>
                </div>
              </Card>
            </div>

            {/* Pending Bookings Alert */}
            {stats.pendingBookings > 0 && (
              <Card className="p-6 border-orange-500/50 bg-orange-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Bell className="h-5 w-5 text-orange-500" />
                      Pending Bookings
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You have {stats.pendingBookings} booking{stats.pendingBookings > 1 ? 's' : ''} waiting for confirmation
                    </p>
                  </div>
                  <Button onClick={() => navigate('/chatr-plus/seller/bookings')}>
                    View Bookings
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Bookings Management</h3>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Booking management coming soon</p>
                <Button variant="outline" onClick={() => navigate('/chatr-plus/seller/bookings')}>
                  Go to Full Bookings Page
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Services Management</h3>
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Manage your services</p>
                <Button onClick={() => navigate('/chatr-plus/seller/services')}>
                  Manage Services
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Customer Reviews</h3>
              <div className="text-center py-12 text-muted-foreground">
                <Star className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No reviews yet</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Analytics</h3>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Analytics dashboard coming soon</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
