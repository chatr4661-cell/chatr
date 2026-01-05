import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, Wrench, Zap, Droplets, Paintbrush, 
  Wind, Scissors, Upload, CheckCircle, Shield
} from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_CATEGORIES = [
  { id: 'plumbing', name: 'Plumbing', icon: Droplets },
  { id: 'electrical', name: 'Electrical', icon: Zap },
  { id: 'carpentry', name: 'Carpentry', icon: Wrench },
  { id: 'painting', name: 'Painting', icon: Paintbrush },
  { id: 'cleaning', name: 'Cleaning', icon: Scissors },
  { id: 'hvac', name: 'AC/HVAC', icon: Wind },
];

interface FormData {
  businessName: string;
  description: string;
  category: string;
  experience: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadhaarNumber: string;
  panNumber: string;
  basePrice: string;
  pricingType: string;
  acceptTerms: boolean;
}

export default function ServiceProviderRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    description: '',
    category: '',
    experience: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    aadhaarNumber: '',
    panNumber: '',
    basePrice: '',
    pricingType: 'hourly',
    acceptTerms: false
  });

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.acceptTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to register');
        navigate('/auth');
        return;
      }

      const { error } = await supabase.from('service_providers').insert({
        user_id: user.id,
        business_name: formData.businessName,
        description: formData.description,
        experience_years: parseInt(formData.experience) || 0,
        phone_number: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        aadhaar_number: formData.aadhaarNumber,
        pan_number: formData.panNumber,
        base_price: parseFloat(formData.basePrice) || 0,
        pricing_type: formData.pricingType,
        kyc_status: 'pending',
        is_active: true,
        is_online: false,
        commission_percentage: 10 // 10% platform commission for 15% lower pricing
      });

      if (error) throw error;

      // Send notification to admin
      await supabase.functions.invoke('send-service-notification', {
        body: {
          type: 'provider_registration',
          providerName: formData.businessName,
          category: formData.category
        }
      });

      toast.success('Registration submitted! We will verify your details within 24-48 hours.');
      navigate('/vendor/provider-dashboard');
    } catch (error) {
      console.error('Error registering:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="businessName">Business Name *</Label>
        <Input
          id="businessName"
          value={formData.businessName}
          onChange={(e) => updateField('businessName', e.target.value)}
          placeholder="Your business/professional name"
        />
      </div>

      <div>
        <Label htmlFor="category">Service Category *</Label>
        <Select 
          value={formData.category} 
          onValueChange={(v) => updateField('category', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_CATEGORIES.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">About Your Services *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe your expertise and services..."
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="experience">Years of Experience</Label>
        <Input
          id="experience"
          type="number"
          value={formData.experience}
          onChange={(e) => updateField('experience', e.target.value)}
          placeholder="e.g., 5"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="+91 XXXXX XXXXX"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="your@email.com"
        />
      </div>

      <div>
        <Label htmlFor="address">Address *</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => updateField('address', e.target.value)}
          placeholder="Your complete address"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => updateField('city', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => updateField('state', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="pincode">Pincode</Label>
        <Input
          id="pincode"
          value={formData.pincode}
          onChange={(e) => updateField('pincode', e.target.value)}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Verification Required</p>
              <p className="text-sm text-blue-700">
                Your KYC documents will be verified within 24-48 hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label htmlFor="aadhaar">Aadhaar Number *</Label>
        <Input
          id="aadhaar"
          value={formData.aadhaarNumber}
          onChange={(e) => updateField('aadhaarNumber', e.target.value)}
          placeholder="XXXX XXXX XXXX"
          maxLength={14}
        />
      </div>

      <div>
        <Label htmlFor="pan">PAN Number</Label>
        <Input
          id="pan"
          value={formData.panNumber}
          onChange={(e) => updateField('panNumber', e.target.value.toUpperCase())}
          placeholder="ABCDE1234F"
          maxLength={10}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="basePrice">Base Price (₹) *</Label>
          <Input
            id="basePrice"
            type="number"
            value={formData.basePrice}
            onChange={(e) => updateField('basePrice', e.target.value)}
            placeholder="500"
          />
        </div>
        <div>
          <Label htmlFor="pricingType">Pricing Type</Label>
          <Select 
            value={formData.pricingType} 
            onValueChange={(v) => updateField('pricingType', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Per Hour</SelectItem>
              <SelectItem value="fixed">Fixed Price</SelectItem>
              <SelectItem value="custom">Custom Quote</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <p className="text-sm text-green-800">
            <strong>CHATR Advantage:</strong> Your services will be listed at 15% lower than market rates. 
            We charge only 10% commission, ensuring you earn more than other platforms!
          </p>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3">
        <Checkbox
          id="terms"
          checked={formData.acceptTerms}
          onCheckedChange={(checked) => updateField('acceptTerms', checked as boolean)}
        />
        <label htmlFor="terms" className="text-sm text-muted-foreground">
          I accept the Terms of Service and Privacy Policy. I confirm that all 
          information provided is accurate and I am eligible to provide these services.
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-primary-foreground mb-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Become a Service Provider</h1>
        <p className="text-sm opacity-80">Join CHATR and grow your business</p>
      </div>

      {/* Progress */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold
                ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}>
                {step > s ? <CheckCircle className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 sm:w-24 h-1 mx-2 ${
                  step > s ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {step === 1 && 'Business Details'}
              {step === 2 && 'Contact Information'}
              {step === 3 && 'Verification & Pricing'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3">
        {step > 1 && (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setStep(s => s - 1)}
          >
            Previous
          </Button>
        )}
        {step < 3 ? (
          <Button 
            className="flex-1"
            onClick={() => setStep(s => s + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button 
            className="flex-1"
            onClick={handleSubmit}
            disabled={submitting || !formData.acceptTerms}
          >
            {submitting ? 'Submitting...' : 'Submit Registration'}
          </Button>
        )}
      </div>
    </div>
  );
}
