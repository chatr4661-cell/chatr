import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, MapPin, Phone, Mail, Clock, CheckCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ProviderDetails {
  id: string;
  business_name: string;
  description: string;
  rating_average: number;
  rating_count: number;
  city: string;
  address: string;
  phone_number: string;
  email: string;
  experience_years: number;
  profile_image_url: string;
  base_price: number;
  pricing_type: string;
  is_verified: boolean;
  is_online: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  customer_name: string;
  customer_avatar: string;
}

const ProviderDetails = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviderDetails();
    fetchReviews();
  }, [providerId]);

  const fetchProviderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (error) throw error;
      setProvider(data as ProviderDetails);
    } catch (error) {
      toast.error('Failed to load provider details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('service_reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          customer_id
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const reviewsWithProfiles = await Promise.all((data || []).map(async (r) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', r.customer_id)
          .single();

        return {
          id: r.id,
          rating: r.rating,
          comment: r.review_text || '',
          created_at: r.created_at,
          customer_name: profile?.username || 'Anonymous',
          customer_avatar: profile?.avatar_url || ''
        };
      }));

      setReviews(reviewsWithProfiles);
    } catch (error) {
      console.error('Failed to load reviews');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!provider) {
    return <div className="min-h-screen flex items-center justify-center">Provider not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-gradient-glass backdrop-blur-glass border-b border-glass-border">
        <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Provider Details</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Provider Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {provider.profile_image_url ? (
                  <img src={provider.profile_image_url} alt={provider.business_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {provider.business_name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{provider.business_name}</CardTitle>
                  {provider.is_verified && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-2">{provider.description}</CardDescription>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-5 w-5 fill-current" />
                    <span className="font-bold text-lg">{provider.rating_average?.toFixed(1) || 'New'}</span>
                    <span className="text-muted-foreground text-sm">({provider.rating_count || 0} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{provider.experience_years} years exp</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{provider.address}, {provider.city}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{provider.phone_number}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{provider.email}</span>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Starting from</div>
                <div className="text-3xl font-bold text-primary">₹{provider.base_price}</div>
              </div>
              <Button 
                size="lg" 
                onClick={() => navigate(`/book/${provider.id}`)}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Book Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="space-y-4 mt-4">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No reviews yet
                </CardContent>
              </Card>
            ) : (
              reviews.map((review) => (
                <Card key={review.id}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {review.customer_avatar ? (
                          <img src={review.customer_avatar} alt={review.customer_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-primary">{review.customer_name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{review.customer_name}</CardTitle>
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-bold">{review.rating}</span>
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          {new Date(review.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {review.comment && (
                    <CardContent>
                      <p className="text-sm text-foreground">{review.comment}</p>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="about" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>About the Provider</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Experience</h4>
                  <p className="text-muted-foreground">{provider.experience_years} years in the industry</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Pricing Type</h4>
                  <Badge>{provider.pricing_type}</Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <Badge variant={provider.is_online ? 'default' : 'secondary'}>
                    {provider.is_online ? 'Available' : 'Offline'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProviderDetails;
