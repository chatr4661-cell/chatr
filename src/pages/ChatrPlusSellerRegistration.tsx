import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  ArrowRight,
  Upload,
  Store,
  MapPin,
  Clock,
  CreditCard,
  CheckCircle2,
  Star,
  Crown,
  Zap,
  Sparkles,
  Building,
  Mail,
  Phone,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const businessDetailsSchema = z.object({
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters").max(255, "Business name too long"),
  businessType: z.string().min(1, "Please select a business type"),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(500, "Description too long"),
  phoneNumber: z.string().trim().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  email: z.string().trim().email("Invalid email address").max(255),
  address: z.string().trim().min(5, "Address must be at least 5 characters").max(500),
  city: z.string().trim().min(2, "City must be at least 2 characters").max(100),
  state: z.string().trim().min(2, "State must be at least 2 characters").max(100),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, "Pincode must be 6 digits")
});

const bankDetailsSchema = z.object({
  accountHolderName: z.string().trim().min(2, "Account holder name required").max(255),
  accountNumber: z.string().trim().regex(/^[0-9]{9,18}$/, "Invalid account number"),
  ifscCode: z.string().trim().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
  bankName: z.string().trim().min(2, "Bank name required").max(255)
});

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ChatrPlusSellerRegistration() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Business Details
  const [businessDetails, setBusinessDetails] = useState({
    businessName: '',
    businessType: '',
    description: '',
    phoneNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  // Step 2: Logo Upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Step 3: Category & Service Area
  const [selectedCategory, setSelectedCategory] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  // Step 4: Operating Hours
  const [operatingHours, setOperatingHours] = useState<Record<string, { open: string; close: string; isOpen: boolean }>>({
    monday: { open: '09:00', close: '18:00', isOpen: true },
    tuesday: { open: '09:00', close: '18:00', isOpen: true },
    wednesday: { open: '09:00', close: '18:00', isOpen: true },
    thursday: { open: '09:00', close: '18:00', isOpen: true },
    friday: { open: '09:00', close: '18:00', isOpen: true },
    saturday: { open: '09:00', close: '18:00', isOpen: true },
    sunday: { open: '09:00', close: '18:00', isOpen: false }
  });

  // Step 5: Bank Details
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: ''
  });

  // Step 6: Subscription Plan
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'featured' | 'premium'>('basic');

  const subscriptionPlans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 99,
      icon: Store,
      color: 'from-blue-500 to-cyan-500',
      features: [
        'Basic listing on marketplace',
        'Up to 5 services',
        'Standard support',
        'Basic analytics',
        '5% transaction fee'
      ]
    },
    {
      id: 'featured',
      name: 'Featured',
      price: 499,
      icon: Star,
      color: 'from-purple-500 to-pink-500',
      popular: true,
      features: [
        'Featured listing',
        'Up to 20 services',
        'Priority support',
        'Advanced analytics',
        '3% transaction fee',
        'Featured badge',
        'Top search results'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 1999,
      icon: Crown,
      color: 'from-amber-500 to-orange-500',
      features: [
        'Premium placement',
        'Unlimited services',
        '24/7 priority support',
        'Full analytics suite',
        '1.5% transaction fee',
        'Verified badge',
        'AI-powered leads',
        'Custom promotions',
        'Dedicated account manager'
      ]
    }
  ];

  const categories = [
    { value: 'food', label: 'Food & Dining' },
    { value: 'home-services', label: 'Home Services' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'beauty-wellness', label: 'Beauty & Wellness' },
    { value: 'jobs', label: 'Local Jobs' },
    { value: 'education', label: 'Education' },
    { value: 'business', label: 'Business Tools' }
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (step: number): boolean => {
    try {
      if (step === 1) {
        businessDetailsSchema.parse(businessDetails);
      } else if (step === 2) {
        if (!logoFile) {
          toast.error('Please upload a business logo');
          return false;
        }
      } else if (step === 3) {
        if (!selectedCategory) {
          toast.error('Please select a business category');
          return false;
        }
        if (!serviceArea.trim()) {
          toast.error('Please specify your service area');
          return false;
        }
        if (serviceArea.length > 255) {
          toast.error('Service area description too long');
          return false;
        }
      } else if (step === 5) {
        bankDetailsSchema.parse(bankDetails);
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please login to continue');
        navigate('/auth');
        return;
      }

      // Upload logo to Supabase Storage
      let logoUrl = '';
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(`seller-logos/${fileName}`, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(`seller-logos/${fileName}`);
        
        logoUrl = publicUrl;
      }

      // Create seller profile
      const { error: sellerError } = await supabase
        .from('chatr_plus_sellers')
        .insert({
          user_id: user.id,
          business_name: businessDetails.businessName,
          business_type: selectedCategory,
          description: businessDetails.description,
          logo_url: logoUrl,
          phone_number: businessDetails.phoneNumber,
          email: businessDetails.email,
          address: businessDetails.address,
          city: businessDetails.city,
          state: businessDetails.state,
          pincode: businessDetails.pincode,
          subscription_plan: selectedPlan,
          subscription_amount: subscriptionPlans.find(p => p.id === selectedPlan)?.price || 99,
          subscription_status: 'active',
          subscription_started_at: new Date().toISOString(),
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        });

      if (sellerError) throw sellerError;

      // Process payment
      const planPrice = subscriptionPlans.find(p => p.id === selectedPlan)?.price || 99;
      const { error: paymentError } = await supabase.rpc('process_chatr_plus_payment', {
        p_user_id: user.id,
        p_amount: planPrice,
        p_transaction_type: 'subscription',
        p_payment_method: 'wallet',
        p_description: `Chatr+ Seller - ${selectedPlan} plan (Monthly)`
      });

      if (paymentError) throw paymentError;

      toast.success('🎉 Registration successful! Welcome to Chatr+');
      navigate('/chatr-plus/seller/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / 6) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => currentStep === 1 ? navigate('/chatr-plus') : prevStep()}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Become a Chatr+ Seller</h1>
              <p className="text-sm text-muted-foreground">
                Step {currentStep} of 6
              </p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Business Details */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Building className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Business Details</h2>
                    <p className="text-sm text-muted-foreground">
                      Tell us about your business
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      placeholder="Enter your business name"
                      value={businessDetails.businessName}
                      onChange={(e) => setBusinessDetails({
                        ...businessDetails,
                        businessName: e.target.value
                      })}
                      maxLength={255}
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessType">Business Type *</Label>
                    <Select
                      value={businessDetails.businessType}
                      onValueChange={(value) => setBusinessDetails({
                        ...businessDetails,
                        businessType: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your business and services"
                      value={businessDetails.description}
                      onChange={(e) => setBusinessDetails({
                        ...businessDetails,
                        description: e.target.value
                      })}
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {businessDetails.description.length}/500 characters
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="10-digit number"
                        value={businessDetails.phoneNumber}
                        onChange={(e) => setBusinessDetails({
                          ...businessDetails,
                          phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)
                        })}
                        maxLength={10}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="business@example.com"
                        value={businessDetails.email}
                        onChange={(e) => setBusinessDetails({
                          ...businessDetails,
                          email: e.target.value
                        })}
                        maxLength={255}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Textarea
                      id="address"
                      placeholder="Complete business address"
                      value={businessDetails.address}
                      onChange={(e) => setBusinessDetails({
                        ...businessDetails,
                        address: e.target.value
                      })}
                      rows={2}
                      maxLength={500}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        placeholder="City"
                        value={businessDetails.city}
                        onChange={(e) => setBusinessDetails({
                          ...businessDetails,
                          city: e.target.value
                        })}
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        placeholder="State"
                        value={businessDetails.state}
                        onChange={(e) => setBusinessDetails({
                          ...businessDetails,
                          state: e.target.value
                        })}
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        placeholder="6 digits"
                        value={businessDetails.pincode}
                        onChange={(e) => setBusinessDetails({
                          ...businessDetails,
                          pincode: e.target.value.replace(/\D/g, '').slice(0, 6)
                        })}
                        maxLength={6}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Logo Upload */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Business Logo</h2>
                    <p className="text-sm text-muted-foreground">
                      Upload your business logo
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    {logoPreview ? (
                      <div className="space-y-4">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-32 h-32 mx-auto rounded-lg object-cover"
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview('');
                          }}
                        >
                          Change Logo
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-semibold mb-2">Upload Logo</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          PNG, JPG or WEBP (Max 5MB)
                        </p>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="max-w-xs mx-auto"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your logo will appear on your business profile and service listings
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Category & Service Area */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Service Details</h2>
                    <p className="text-sm text-muted-foreground">
                      Category and coverage area
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category">Primary Category *</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your main category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="serviceArea">Service Area Coverage *</Label>
                    <Input
                      id="serviceArea"
                      placeholder="e.g., Delhi NCR, Mumbai, Bangalore"
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                      maxLength={255}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Specify the cities or areas you serve
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Operating Hours */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Operating Hours</h2>
                    <p className="text-sm text-muted-foreground">
                      Set your business hours
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={operatingHours[day].isOpen}
                          onChange={(e) => setOperatingHours({
                            ...operatingHours,
                            [day]: { ...operatingHours[day], isOpen: e.target.checked }
                          })}
                          className="w-4 h-4"
                        />
                        <span className="font-medium capitalize w-24">{day}</span>
                      </div>
                      {operatingHours[day].isOpen && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={operatingHours[day].open}
                            onChange={(e) => setOperatingHours({
                              ...operatingHours,
                              [day]: { ...operatingHours[day], open: e.target.value }
                            })}
                            className="w-32"
                          />
                          <span>to</span>
                          <Input
                            type="time"
                            value={operatingHours[day].close}
                            onChange={(e) => setOperatingHours({
                              ...operatingHours,
                              [day]: { ...operatingHours[day], close: e.target.value }
                            })}
                            className="w-32"
                          />
                        </div>
                      )}
                      {!operatingHours[day].isOpen && (
                        <span className="text-sm text-muted-foreground">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 5: Bank Details */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Bank Details</h2>
                    <p className="text-sm text-muted-foreground">
                      For receiving payments
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                    <Input
                      id="accountHolderName"
                      placeholder="As per bank account"
                      value={bankDetails.accountHolderName}
                      onChange={(e) => setBankDetails({
                        ...bankDetails,
                        accountHolderName: e.target.value
                      })}
                      maxLength={255}
                    />
                  </div>

                  <div>
                    <Label htmlFor="accountNumber">Account Number *</Label>
                    <Input
                      id="accountNumber"
                      type="text"
                      placeholder="Bank account number"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({
                        ...bankDetails,
                        accountNumber: e.target.value.replace(/\D/g, '').slice(0, 18)
                      })}
                      maxLength={18}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ifscCode">IFSC Code *</Label>
                    <Input
                      id="ifscCode"
                      placeholder="e.g., SBIN0001234"
                      value={bankDetails.ifscCode}
                      onChange={(e) => setBankDetails({
                        ...bankDetails,
                        ifscCode: e.target.value.toUpperCase()
                      })}
                      maxLength={11}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Input
                      id="bankName"
                      placeholder="Name of your bank"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({
                        ...bankDetails,
                        bankName: e.target.value
                      })}
                      maxLength={255}
                    />
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      🔒 Your bank details are securely encrypted and will only be used for payment settlements
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 6: Subscription Plan */}
          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
                  <p className="text-muted-foreground">
                    Select the plan that best fits your business needs
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {subscriptionPlans.map((plan) => {
                    const Icon = plan.icon;
                    return (
                      <Card
                        key={plan.id}
                        className={`p-6 cursor-pointer transition-all relative ${
                          selectedPlan === plan.id
                            ? 'ring-2 ring-primary shadow-lg scale-105'
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedPlan(plan.id as any)}
                      >
                        {plan.popular && (
                          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500">
                            Most Popular
                          </Badge>
                        )}

                        <div className={`bg-gradient-to-r ${plan.color} p-3 rounded-lg w-fit mx-auto mb-4`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>

                        <h3 className="text-2xl font-bold text-center mb-2">{plan.name}</h3>
                        <div className="text-center mb-4">
                          <span className="text-4xl font-bold">₹{plan.price}</span>
                          <span className="text-muted-foreground">/month</span>
                        </div>

                        <div className="space-y-2 mb-4">
                          {plan.features.map((feature, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>

                        {selectedPlan === plan.id && (
                          <Badge className="w-full justify-center bg-primary">
                            Selected
                          </Badge>
                        )}
                      </Card>
                    );
                  })}
                </div>

                <Card className="p-6 bg-muted">
                  <h3 className="font-semibold mb-4">Payment Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {subscriptionPlans.find(p => p.id === selectedPlan)?.name} Plan
                      </span>
                      <span className="font-medium">
                        ₹{subscriptionPlans.find(p => p.id === selectedPlan)?.price}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Billing Period</span>
                      <span>Monthly</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary">
                        ₹{subscriptionPlans.find(p => p.id === selectedPlan)?.price}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
          {currentStep < 6 ? (
            <Button onClick={nextStep} className="ml-auto">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="ml-auto bg-gradient-to-r from-primary to-primary-glow"
              size="lg"
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Complete Registration
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
