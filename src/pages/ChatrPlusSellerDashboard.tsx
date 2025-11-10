import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  TrendingUp,
  Calendar,
  DollarSign,
  Star,
  Package,
  Users,
  Clock,
  Plus,
  Settings,
  Bell,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function ChatrPlusSellerDashboard() {
  const navigate = useNavigate();

  // Fetch seller profile
  const { data: seller, isLoading } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chatr_plus_sellers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch bookings
  const { data: bookings } = useQuery({
    queryKey: ['seller-bookings'],
    queryFn: async () => {
      if (!seller) return [];

      const { data, error } = await supabase
        .from('chatr_plus_bookings')
        .select(`
          *,
          service:chatr_plus_services(service_name),
          user:profiles(username, avatar_url)
        `)
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!seller
  });

  // Calculate stats
  const stats = {
    totalEarnings: bookings?.reduce((sum, b: any) => sum + (b.total_amount || 0), 0) || 0,
    totalBookings: bookings?.length || 0,
    pendingBookings: bookings?.filter((b: any) => b.status === 'pending').length || 0,
    completedBookings: bookings?.filter((b: any) => b.status === 'completed').length || 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'in_progress': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">No Seller Profile Found</h2>
          <p className="text-muted-foreground mb-6">
            You haven't registered as a Chatr+ seller yet.
          </p>
          <Button onClick={() => navigate('/chatr-plus/seller-registration')}>
            Register Now
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chatr-plus')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Seller Dashboard</h1>
              <p className="text-sm text-muted-foreground">{seller.business_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Business Profile Card */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={seller.logo_url || ''} />
              <AvatarFallback>{seller.business_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{seller.business_name}</h2>
                {seller.is_verified && (
                  <Badge variant="secondary">✓ Verified</Badge>
                )}
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                  {seller.subscription_plan}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{seller.rating_average || '4.5'}</span>
                </div>
                <span>•</span>
                <span>{seller.total_bookings || 0} completed bookings</span>
                <span>•</span>
                <span>{seller.city}</span>
              </div>
              <p className="text-sm text-muted-foreground">{seller.description}</p>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold">₹{stats.totalEarnings.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Earnings</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <div className="text-sm text-muted-foreground">Total Bookings</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="text-2xl font-bold">{stats.pendingBookings}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-purple-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold">{stats.completedBookings}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button className="h-24 flex-col gap-2">
            <Plus className="w-6 h-6" />
            <span>Add Service</span>
          </Button>
          <Button variant="outline" className="h-24 flex-col gap-2">
            <Package className="w-6 h-6" />
            <span>Manage Services</span>
          </Button>
          <Button variant="outline" className="h-24 flex-col gap-2">
            <BarChart3 className="w-6 h-6" />
            <span>Analytics</span>
          </Button>
          <Button variant="outline" className="h-24 flex-col gap-2">
            <Users className="w-6 h-6" />
            <span>Customers</span>
          </Button>
        </div>

        {/* Recent Bookings */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Recent Bookings</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>

          {bookings && bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking: any) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={booking.user?.avatar_url} />
                      <AvatarFallback>{booking.customer_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{booking.customer_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {booking.service?.service_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.booking_date).toLocaleDateString()} at{' '}
                        {new Date(booking.booking_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                    <div className="text-lg font-bold text-primary mt-2">
                      ₹{booking.total_amount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No bookings yet</h3>
              <p className="text-sm text-muted-foreground">
                Your bookings will appear here once customers book your services
              </p>
            </div>
          )}
        </Card>

        {/* Subscription Info */}
        <Card className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">
                {seller.subscription_plan.charAt(0).toUpperCase() + seller.subscription_plan.slice(1)} Plan
              </h3>
              <p className="text-sm text-muted-foreground">
                Next billing: {new Date(seller.subscription_expires_at).toLocaleDateString()}
              </p>
            </div>
            <Button variant="outline">
              Upgrade Plan
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
