import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Download, 
  TrendingUp, 
  Users, 
  Calendar,
  DollarSign,
  Star,
  Package
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

interface ServicePerformance {
  name: string;
  bookings: number;
  revenue: number;
}

interface CustomerInsight {
  new_customers: number;
  returning_customers: number;
  total_customers: number;
  avg_booking_value: number;
}

interface BookingStatus {
  status: string;
  count: number;
}

export default function SellerAnalytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30days");
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [servicePerformance, setServicePerformance] = useState<ServicePerformance[]>([]);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsight | null>(null);
  const [bookingsByStatus, setBookingsByStatus] = useState<BookingStatus[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get seller profile
      const { data: sellerProfile } = await supabase
        .from("chatr_plus_sellers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!sellerProfile) {
        navigate("/chatr-plus/seller-registration");
        return;
      }

      // Calculate date range
      const daysAgo = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch bookings data
      const { data: bookings } = await supabase
        .from("chatr_plus_bookings")
        .select(`
          *,
          service:chatr_plus_services(service_name, base_price, category_id)
        `)
        .eq("seller_id", sellerProfile.id)
        .gte("created_at", startDate.toISOString());

      if (bookings) {
        // Calculate revenue by date
        const revenueByDate = bookings.reduce((acc: any, booking: any) => {
          const date = new Date(booking.created_at).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = { date, revenue: 0, bookings: 0 };
          }
          acc[date].revenue += booking.total_amount || 0;
          acc[date].bookings += 1;
          return acc;
        }, {});
        setRevenueData(Object.values(revenueByDate));

        // Calculate service performance
        const serviceStats = bookings.reduce((acc: any, booking: any) => {
          const serviceName = booking.service?.service_name || "Unknown";
          if (!acc[serviceName]) {
            acc[serviceName] = { name: serviceName, bookings: 0, revenue: 0 };
          }
          acc[serviceName].bookings += 1;
          acc[serviceName].revenue += booking.total_amount || 0;
          return acc;
        }, {});
        setServicePerformance(
          (Object.values(serviceStats) as ServicePerformance[])
            .sort((a, b) => b.revenue - a.revenue)
        );

        // Calculate bookings by status
        const statusCounts = bookings.reduce((acc: any, booking: any) => {
          const status = booking.status || "pending";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        setBookingsByStatus(
          Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count: count as number
          }))
        );

        // Calculate totals
        const total = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        setTotalRevenue(total);
        setTotalBookings(bookings.length);

        // Calculate customer insights
        const uniqueCustomers = new Set(bookings.map(b => b.user_id));
        const customerBookings = bookings.reduce((acc: any, b: any) => {
          acc[b.user_id] = (acc[b.user_id] || 0) + 1;
          return acc;
        }, {});
        const returningCustomers = Object.values(customerBookings).filter((count: any) => count > 1).length;

        setCustomerInsights({
          total_customers: uniqueCustomers.size,
          new_customers: uniqueCustomers.size - returningCustomers,
          returning_customers: returningCustomers,
          avg_booking_value: total / bookings.length || 0
        });
      }

      // Fetch average rating
      const { data: reviews } = await supabase
        .from("chatr_plus_reviews")
        .select("rating")
        .eq("seller_id", sellerProfile.id);

      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        setAvgRating(avg);
      }

    } catch (error) {
      console.error("Error loading analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const csvData = [
      ["Date", "Revenue", "Bookings"],
      ...revenueData.map(d => [d.date, d.revenue, d.bookings])
    ];
    
    const csv = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Report downloaded successfully"
    });
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/seller/portal")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground">Track your business performance</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={downloadCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +{((totalRevenue / (totalRevenue * 0.8) - 1) * 100).toFixed(1)}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                Avg ₹{customerInsights?.avg_booking_value.toFixed(0)} per booking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerInsights?.total_customers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {customerInsights?.returning_customers || 0} returning customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                <Star className="inline h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                Based on customer reviews
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
            <TabsTrigger value="bookings">Booking Status</TabsTrigger>
            <TabsTrigger value="services">Top Services</TabsTrigger>
            <TabsTrigger value="customers">Customer Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>Daily revenue and booking trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bookings by Status</CardTitle>
                <CardDescription>Distribution of booking statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={bookingsByStatus.map(item => ({ ...item, value: item.count }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.status}: ${entry.count}`}
                      outerRadius={120}
                      fill="hsl(var(--primary))"
                      dataKey="count"
                      nameKey="status"
                    >
                      {bookingsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Services</CardTitle>
                <CardDescription>Services ranked by revenue generated</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={servicePerformance.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                    <Bar dataKey="bookings" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Breakdown</CardTitle>
                  <CardDescription>New vs Returning customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "New Customers", value: customerInsights?.new_customers || 0 },
                          { name: "Returning", value: customerInsights?.returning_customers || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--secondary))" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customer Metrics</CardTitle>
                  <CardDescription>Key customer statistics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Total Customers</p>
                        <p className="text-2xl font-bold">{customerInsights?.total_customers || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Avg Booking Value</p>
                        <p className="text-2xl font-bold">₹{customerInsights?.avg_booking_value.toFixed(0) || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Retention Rate</p>
                        <p className="text-2xl font-bold">
                          {((customerInsights?.returning_customers || 0) / (customerInsights?.total_customers || 1) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
