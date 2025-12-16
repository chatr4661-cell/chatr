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
  User,
  Shield,
  TrendingUp,
  Gift
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

const steps = [
  { id: 1, title: 'Business Details', icon: Building, description: 'Tell us about your business' },
  { id: 2, title: 'Brand Identity', icon: Upload, description: 'Upload your logo' },
  { id: 3, title: 'Service Area', icon: MapPin, description: 'Define your coverage' },
  { id: 4, title: 'KYC Documents', icon: Shield, description: 'Verify your business' },
  { id: 5, title: 'Bank Details', icon: CreditCard, description: 'Payment setup' },
  { id: 6, title: 'Choose Plan', icon: Crown, description: 'Select subscription' },
];

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

  // Step 4: KYC Documents
  const [kycDetails, setKycDetails] = useState({
    gstin: '',
    panNumber: '',
    aadharNumber: ''
  });
  const [kycFiles, setKycFiles] = useState<{
    pan?: File;
    aadhar?: File;
    gstin?: File;
    business_registration?: File;
  }>({});

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
      name: 'Starter',
      price: 99,
      icon: Store,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      bgGradient: 'from-blue-500/10 via-cyan-500/5 to-teal-500/10',
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
      name: 'Professional',
      price: 499,
      icon: Star,
      gradient: 'from-purple-500 via-violet-500 to-fuchsia-500',
      bgGradient: 'from-purple-500/10 via-violet-500/5 to-fuchsia-500/10',
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
      name: 'Enterprise',
      price: 1999,
      icon: Crown,
      gradient: 'from-amber-500 via-orange-500 to-rose-500',
      bgGradient: 'from-amber-500/10 via-orange-500/5 to-rose-500/10',
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
    { value: 'food', label: 'Food & Dining', icon: '🍕' },
    { value: 'home-services', label: 'Home Services', icon: '🏠' },
    { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { value: 'beauty-wellness', label: 'Beauty & Wellness', icon: '💅' },
    { value: 'jobs', label: 'Local Jobs', icon: '💼' },
    { value: 'education', label: 'Education', icon: '📚' },
    { value: 'business', label: 'Business Tools', icon: '📊' }
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
      } else if (step === 4) {
        if (!kycDetails.panNumber || kycDetails.panNumber.length !== 10) {
          toast.error('Please enter a valid PAN number');
          return false;
        }
        if (!kycDetails.aadharNumber || kycDetails.aadharNumber.length !== 12) {
          toast.error('Please enter a valid Aadhar number');
          return false;
        }
        if (!kycFiles.pan || !kycFiles.aadhar) {
          toast.error('Please upload both PAN and Aadhar documents');
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
        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(`seller-logos/${fileName}`, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(`seller-logos/${fileName}`);
        
        logoUrl = publicUrl;
      }

      // Upload KYC documents
      const kycDocUrls: { type: string; url: string }[] = [];
      for (const [docType, file] of Object.entries(kycFiles)) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}-${docType}-${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('kyc-documents')
            .upload(`seller-kyc/${fileName}`, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('kyc-documents')
            .getPublicUrl(`seller-kyc/${fileName}`);
          
          kycDocUrls.push({ type: docType, url: publicUrl });
        }
      }

      // Create seller profile with pending approval
      const { data: sellerData, error: sellerError } = await supabase
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
          subscription_status: 'pending',
          subscription_started_at: new Date().toISOString(),
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: false,
          is_verified: false,
          approval_status: 'pending',
          kyc_status: 'submitted',
          pan_number: kycDetails.panNumber,
          aadhar_number: kycDetails.aadharNumber,
          gstin: kycDetails.gstin || null,
          kyc_documents: kycDocUrls
        })
        .select('id')
        .single();

      if (sellerError) throw sellerError;

      // Insert KYC documents records
      if (sellerData?.id) {
        for (const doc of kycDocUrls) {
          await supabase
            .from('seller_kyc_documents')
            .insert({
              seller_id: sellerData.id,
              document_type: doc.type,
              document_url: doc.url,
              status: 'pending'
            });
        }
      }

      toast.success('🎉 Registration submitted! Your application is under review.');
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      {/* Premium Header with Glass Effect */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => currentStep === 1 ? navigate('/chatr-plus') : prevStep()}
              className="rounded-full hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Chatr+
                </span>
                <Badge variant="secondary" className="bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Seller
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Step {currentStep} of 6 • {steps[currentStep - 1].title}
              </p>
            </div>
          </div>
          
          {/* Premium Progress Bar */}
          <div className="relative">
            <Progress value={progress} className="h-2 bg-muted/50" />
            <div 
              className="absolute top-0 left-0 h-2 rounded-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4 overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center min-w-[60px] transition-all duration-300 ${
                    isCurrent ? 'scale-110' : ''
                  }`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isCompleted 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25' 
                      : isCurrent 
                        ? 'bg-gradient-to-br from-primary to-purple-500 text-white shadow-lg shadow-primary/25 animate-pulse'
                        : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 whitespace-nowrap ${
                    isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Business Details */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 md:p-8 border-0 shadow-xl bg-gradient-to-br from-card via-card to-primary/5 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-gradient-to-br from-primary to-purple-500 p-4 rounded-2xl shadow-lg shadow-primary/25">
                    <Building className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">Business Details</h2>
                    <p className="text-muted-foreground">
                      Let's start with the basics
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-sm font-semibold flex items-center gap-2">
                      <Store className="w-4 h-4 text-primary" />
                      Business Name
                    </Label>
                    <Input
                      id="businessName"
                      placeholder="Enter your business name"
                      value={businessDetails.businessName}
                      onChange={(e) => setBusinessDetails({
                        ...businessDetails,
                        businessName: e.target.value
                      })}
                      maxLength={255}
                      className="h-12 text-base border-2 focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType" className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Business Type
                    </Label>
                    <Select
                      value={businessDetails.businessType}
                      onValueChange={(value) => setBusinessDetails({
                        ...businessDetails,
                        businessType: value
                      })}
                    >
                      <SelectTrigger className="h-12 text-base border-2 focus:border-primary">
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              <span>{cat.icon}</span>
                              {cat.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your business and services in detail..."
                      value={businessDetails.description}
                      onChange={(e) => setBusinessDetails({
                        ...businessDetails,
                        description: e.target.value
                      })}
                      rows={4}
                      maxLength={500}
                      className="text-base border-2 focus:border-primary transition-colors resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {businessDetails.description.length}/500
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="text-sm font-semibold flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        Phone Number
                      </Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={businessDetails.phoneNumber}
                        onChange={(e) => setBusinessDetails({
                          ...businessDetails,
                          phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)
                        })}
                        maxLength={10}
                        className="h-12 text-base border-2 focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        Email Address
                      </Label>
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
                        className="h-12 text-base border-2 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Business Address
                    </Label>
                    <Textarea
                      id="address"
                      placeholder="Complete street address"
                      value={businessDetails.address}
                      onChange={(e) => setBusinessDetails({
                        ...businessDetails,
                        address: e.target.value
                      })}
                      rows={2}
                      maxLength={500}
                      className="text-base border-2 focus:border-primary transition-colors resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-semibold">City</Label>
                      <Input
                        id="city"
                        placeholder="City"
                        value={businessDetails.city}
                        onChange={(e) => setBusinessDetails({
                          ...businessDetails,
                          city: e.target.value
                        })}
                        maxLength={100}
                        className="h-12 text-base border-2 focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-sm font-semibold">State</Label>
                      <Input
                        id="state"
                        placeholder="State"
                        value={businessDetails.state}
                        onChange={(e) => setBusinessDetails({
                          ...businessDetails,
                          state: e.target.value
                        })}
                        maxLength={100}
                        className="h-12 text-base border-2 focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pincode" className="text-sm font-semibold">Pincode</Label>
                      <Input
                        id="pincode"
                        placeholder="6 digits"
                        value={businessDetails.pincode}
                        onChange={(e) => setBusinessDetails({
                          ...businessDetails,
                          pincode: e.target.value.replace(/\D/g, '').slice(0, 6)
                        })}
                        maxLength={6}
                        className="h-12 text-base border-2 focus:border-primary transition-colors"
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 md:p-8 border-0 shadow-xl bg-gradient-to-br from-card via-card to-purple-500/5 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-2xl shadow-lg shadow-purple-500/25">
                    <Upload className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">Brand Identity</h2>
                    <p className="text-muted-foreground">
                      Make your business stand out
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={`
                    border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-300
                    ${logoPreview 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5'
                    }
                  `}>
                    {logoPreview ? (
                      <motion.div 
                        className="space-y-6"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <div className="relative w-40 h-40 mx-auto">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full rounded-2xl object-cover shadow-xl ring-4 ring-primary/20"
                          />
                          <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-full shadow-lg">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview('');
                          }}
                          className="border-2"
                        >
                          Change Logo
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                          <Upload className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">Upload Your Logo</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            PNG, JPG or WEBP • Max 5MB
                          </p>
                        </div>
                        <label className="inline-block">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <div className="px-6 py-3 bg-gradient-to-r from-primary to-purple-500 text-white rounded-xl cursor-pointer hover:opacity-90 transition-opacity font-semibold shadow-lg shadow-primary/25">
                            Choose File
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 p-4 rounded-xl">
                    <p className="text-sm text-muted-foreground flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      Your logo will appear on your business profile, service listings, and chat conversations with customers
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Category & Service Area */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 md:p-8 border-0 shadow-xl bg-gradient-to-br from-card via-card to-teal-500/5 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-gradient-to-br from-teal-500 to-cyan-500 p-4 rounded-2xl shadow-lg shadow-teal-500/25">
                    <MapPin className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">Service Coverage</h2>
                    <p className="text-muted-foreground">
                      Define where you operate
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Primary Category</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {categories.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setSelectedCategory(cat.value)}
                          className={`
                            p-4 rounded-xl border-2 text-center transition-all duration-200
                            ${selectedCategory === cat.value
                              ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                              : 'border-border hover:border-primary/50 hover:bg-primary/5'
                            }
                          `}
                        >
                          <span className="text-2xl block mb-1">{cat.icon}</span>
                          <span className="text-xs font-medium">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceArea" className="text-sm font-semibold">Service Area Coverage</Label>
                    <Input
                      id="serviceArea"
                      placeholder="e.g., Delhi NCR, Mumbai, Bangalore"
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                      maxLength={255}
                      className="h-12 text-base border-2 focus:border-primary transition-colors"
                    />
                    <p className="text-xs text-muted-foreground">
                      Specify the cities or areas where you provide services
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 4: KYC Documents */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 md:p-8 border-0 shadow-xl bg-gradient-to-br from-card via-card to-orange-500/5 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-4 rounded-2xl shadow-lg shadow-orange-500/25">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">KYC Verification</h2>
                    <p className="text-muted-foreground">
                      Verify your business identity
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      PAN Number
                    </Label>
                    <Input
                      placeholder="ABCDE1234F"
                      value={kycDetails.panNumber}
                      onChange={(e) => setKycDetails({
                        ...kycDetails,
                        panNumber: e.target.value.toUpperCase()
                      })}
                      maxLength={10}
                      className="h-12 text-base border-2 focus:border-primary uppercase"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Aadhar Number
                    </Label>
                    <Input
                      placeholder="1234 5678 9012"
                      value={kycDetails.aadharNumber}
                      onChange={(e) => setKycDetails({
                        ...kycDetails,
                        aadharNumber: e.target.value.replace(/\D/g, '').slice(0, 12)
                      })}
                      maxLength={14}
                      className="h-12 text-base border-2 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Store className="w-4 h-4 text-primary" />
                      GSTIN (Optional)
                    </Label>
                    <Input
                      placeholder="22ABCDE1234F1Z5"
                      value={kycDetails.gstin}
                      onChange={(e) => setKycDetails({
                        ...kycDetails,
                        gstin: e.target.value.toUpperCase()
                      })}
                      maxLength={15}
                      className="h-12 text-base border-2 focus:border-primary uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">PAN Card Upload</Label>
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setKycFiles({ ...kycFiles, pan: file });
                          }}
                        />
                        {kycFiles.pan ? (
                          <div className="text-center">
                            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">{kycFiles.pan.name}</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Upload PAN Card</p>
                          </div>
                        )}
                      </label>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Aadhar Card Upload</Label>
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setKycFiles({ ...kycFiles, aadhar: file });
                          }}
                        />
                        {kycFiles.aadhar ? (
                          <div className="text-center">
                            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">{kycFiles.aadhar.name}</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Upload Aadhar Card</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Verification Notice</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your documents will be reviewed by our team. Once approved, your business will be visible to customers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 5: Bank Details */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 md:p-8 border-0 shadow-xl bg-gradient-to-br from-card via-card to-green-500/5 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-4 rounded-2xl shadow-lg shadow-green-500/25">
                    <CreditCard className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">Payment Setup</h2>
                    <p className="text-muted-foreground">
                      Where should we send your earnings?
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName" className="text-sm font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Account Holder Name
                    </Label>
                    <Input
                      id="accountHolderName"
                      placeholder="As per bank account"
                      value={bankDetails.accountHolderName}
                      onChange={(e) => setBankDetails({
                        ...bankDetails,
                        accountHolderName: e.target.value
                      })}
                      maxLength={255}
                      className="h-12 text-base border-2 focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber" className="text-sm font-semibold">Account Number</Label>
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
                      className="h-12 text-base border-2 focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode" className="text-sm font-semibold">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        placeholder="e.g., SBIN0001234"
                        value={bankDetails.ifscCode}
                        onChange={(e) => setBankDetails({
                          ...bankDetails,
                          ifscCode: e.target.value.toUpperCase()
                        })}
                        maxLength={11}
                        className="h-12 text-base border-2 focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bankName" className="text-sm font-semibold">Bank Name</Label>
                      <Input
                        id="bankName"
                        placeholder="Name of your bank"
                        value={bankDetails.bankName}
                        onChange={(e) => setBankDetails({
                          ...bankDetails,
                          bankName: e.target.value
                        })}
                        maxLength={255}
                        className="h-12 text-base border-2 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-4 rounded-xl flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Your bank details are encrypted with bank-grade security and will only be used for payment settlements
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-8">
                <div className="text-center">
                  <Badge className="mb-4 bg-gradient-to-r from-primary to-purple-500 border-0 px-4 py-1">
                    <Crown className="w-3 h-3 mr-1" />
                    Final Step
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold mb-2">Choose Your Plan</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Select the perfect plan to grow your business on Chatr+
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {subscriptionPlans.map((plan) => {
                    const Icon = plan.icon;
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <motion.div
                        key={plan.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`
                            p-6 cursor-pointer transition-all duration-300 relative overflow-hidden border-2
                            ${isSelected
                              ? 'border-primary shadow-2xl shadow-primary/20 scale-105'
                              : 'border-border hover:border-primary/50 hover:shadow-xl'
                            }
                          `}
                          onClick={() => setSelectedPlan(plan.id as any)}
                        >
                          {/* Background Gradient */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${plan.bgGradient} opacity-50`} />
                          
                          {plan.popular && (
                            <Badge className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 border-0 shadow-lg">
                              <Star className="w-3 h-3 mr-1" />
                              Most Popular
                            </Badge>
                          )}

                          <div className="relative z-10">
                            <div className={`bg-gradient-to-r ${plan.gradient} p-4 rounded-2xl w-fit mx-auto mb-4 shadow-lg`}>
                              <Icon className="w-8 h-8 text-white" />
                            </div>

                            <h3 className="text-2xl font-bold text-center mb-1">{plan.name}</h3>
                            <div className="text-center mb-6">
                              <span className="text-4xl font-bold">₹{plan.price}</span>
                              <span className="text-muted-foreground">/month</span>
                            </div>

                            <div className="space-y-3 mb-6">
                              {plan.features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>

                            {isSelected && (
                              <Badge className="w-full justify-center bg-gradient-to-r from-primary to-purple-500 border-0 py-2">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Selected
                              </Badge>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                <Card className="p-6 border-2 border-dashed bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-br from-primary to-purple-500 p-2 rounded-lg">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-lg">Payment Summary</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {subscriptionPlans.find(p => p.id === selectedPlan)?.name} Plan
                      </span>
                      <span className="font-semibold">
                        ₹{subscriptionPlans.find(p => p.id === selectedPlan)?.price}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Billing Period</span>
                      <span>Monthly</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Method</span>
                      <span>Chatr Wallet</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Total</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                        ₹{subscriptionPlans.find(p => p.id === selectedPlan)?.price}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 gap-4">
          {currentStep > 1 ? (
            <Button 
              variant="outline" 
              onClick={prevStep}
              className="border-2 h-12 px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          ) : (
            <div />
          )}
          
          {currentStep < 6 ? (
            <Button 
              onClick={nextStep} 
              className="h-12 px-8 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 shadow-lg shadow-primary/25"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-12 px-8 bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:opacity-90 shadow-lg shadow-primary/25"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processing...
                </>
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
