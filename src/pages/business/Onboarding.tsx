import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Building2, ArrowRight, CheckCircle } from 'lucide-react';

const businessTypes = [
  { value: 'retail', label: 'Retail Store' },
  { value: 'restaurant', label: 'Restaurant/Cafe' },
  { value: 'healthcare', label: 'Healthcare/Clinic' },
  { value: 'education', label: 'Education/Tutoring' },
  { value: 'service', label: 'Service Provider' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'agency', label: 'Agency/Consultancy' },
  { value: 'other', label: 'Other' }
];

export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [formData, setFormData] = useState({
    business_name: '',
    business_type: '',
    description: '',
    business_email: '',
    business_phone: ''
  });

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to create a business profile',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }

      // Check if user already has a business profile
      const { data: existingProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        toast({
          title: 'Profile Exists',
          description: 'You already have a business profile',
        });
        navigate('/business');
        return;
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Create business profile
      const { error } = await supabase
        .from('business_profiles')
        .insert({
          user_id: user.id,
          ...formData
        });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your business profile has been created',
      });

      navigate('/business');
    } catch (error: any) {
      console.error('Error creating business profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create business profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">

      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Business</CardTitle>
          <CardDescription>
            Tell us about your business to get started with Chatr Business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                placeholder="e.g., Acme Corporation"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type">Business Type *</Label>
              <Select
                value={formData.business_type}
                onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe your business..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_email">Business Email</Label>
                <Input
                  id="business_email"
                  type="email"
                  placeholder="contact@business.com"
                  value={formData.business_email}
                  onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_phone">Business Phone</Label>
                <Input
                  id="business_phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.business_phone}
                  onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                What's included in the Free plan:
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Up to 100 customer conversations</li>
                <li>• 1 team member</li>
                <li>• Basic analytics</li>
                <li>• Customer inbox</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !formData.business_name || !formData.business_type}
            >
              {loading ? 'Creating...' : 'Create Business Profile'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By creating a business profile, you agree to our Terms of Service
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
