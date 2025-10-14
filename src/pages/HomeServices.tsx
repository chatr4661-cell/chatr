import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Star, MapPin, Clock, DollarSign, Phone, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface ServiceProvider {
  id: string;
  business_name: string;
  description: string;
  hourly_rate: number;
  rating_average: number;
  rating_count: number;
  completed_jobs: number;
  phone_number: string;
  avatar_url?: string;
  category_id: string;
}

const HomeServices = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [bookingProvider, setBookingProvider] = useState<ServiceProvider | null>(null);
  const [bookingData, setBookingData] = useState({
    scheduled_date: "",
    address: "",
    description: "",
    duration_hours: 2
  });

  useEffect(() => {
    loadCategories();
    loadProviders();
  }, [selectedCategory]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Error loading categories", variant: "destructive" });
      return;
    }

    setCategories(data || []);
  };

  const loadProviders = async () => {
    setLoading(true);
    let query = supabase
      .from("home_service_providers")
      .select("*")
      .eq("verified", true)
      .order("rating_average", { ascending: false });

    if (selectedCategory !== "all") {
      query = query.eq("category_id", selectedCategory);
    }

    const { data, error } = await supabase
      .from("home_service_providers")
      .select("*")
      .eq("verified", true)
      .order("rating_average", { ascending: false });

    if (error) {
      toast({ title: "Error loading providers", variant: "destructive" });
      setLoading(false);
      return;
    }

    setProviders(data || []);
    setLoading(false);
  };

  const handleBooking = async () => {
    if (!bookingProvider) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please sign in to book services", variant: "destructive" });
      return;
    }

    const totalCost = bookingProvider.hourly_rate * bookingData.duration_hours;

    const { error } = await supabase
      .from("home_service_bookings")
      .insert({
        provider_id: bookingProvider.id,
        customer_id: user.id,
        service_type: bookingProvider.business_name,
        scheduled_date: bookingData.scheduled_date,
        address: bookingData.address,
        description: bookingData.description,
        duration_hours: bookingData.duration_hours,
        total_cost: totalCost,
        status: "pending"
      });

    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Booking confirmed!", description: "The provider will contact you soon." });
    setBookingProvider(null);
    setBookingData({ scheduled_date: "", address: "", description: "", duration_hours: 2 });
  };

  const filteredProviders = providers.filter(provider =>
    provider.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">🏠 Home Service Pro</h1>
                <p className="text-sm text-muted-foreground">Professional home services at your fingertips</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All Services</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.icon} {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Providers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">No service providers found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{provider.business_name}</CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{provider.rating_average.toFixed(1)}</span>
                          <span className="text-sm text-muted-foreground">({provider.rating_count})</span>
                        </div>
                      </div>
                      <Badge variant="secondary">{provider.completed_jobs} jobs</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{provider.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">${provider.hourly_rate}/hour</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{provider.phone_number}</span>
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          onClick={() => setBookingProvider(provider)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Book Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Book {provider.business_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="date">Date & Time</Label>
                            <Input
                              id="date"
                              type="datetime-local"
                              value={bookingData.scheduled_date}
                              onChange={(e) => setBookingData({ ...bookingData, scheduled_date: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="duration">Duration (hours)</Label>
                            <Input
                              id="duration"
                              type="number"
                              min="1"
                              value={bookingData.duration_hours}
                              onChange={(e) => setBookingData({ ...bookingData, duration_hours: parseInt(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="address">Service Address</Label>
                            <Input
                              id="address"
                              placeholder="Enter your address"
                              value={bookingData.address}
                              onChange={(e) => setBookingData({ ...bookingData, address: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Service Details</Label>
                            <Textarea
                              id="description"
                              placeholder="Describe what you need..."
                              value={bookingData.description}
                              onChange={(e) => setBookingData({ ...bookingData, description: e.target.value })}
                            />
                          </div>
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">Total Cost:</span>
                              <span className="text-2xl font-bold">
                                ${(provider.hourly_rate * bookingData.duration_hours).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <Button className="w-full" onClick={handleBooking}>
                            Confirm Booking
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeServices;
