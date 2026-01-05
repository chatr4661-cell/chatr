import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  UtensilsCrossed, Tag, Stethoscope, ArrowLeft, 
  ArrowRight, Upload, Building, Phone, Mail,
  MapPin, FileText, CreditCard, Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

type VendorType = 'restaurant' | 'deal_merchant' | 'healthcare_provider';

interface FormData {
  vendorType: VendorType;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  panNumber: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankAccountHolder: string;
  // Restaurant specific
  cuisineTypes: string[];
  fssaiLicense: string;
  isPureVeg: boolean;
  // Deal merchant specific
  businessCategory: string;
  websiteUrl: string;
}

export default function VendorRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    vendorType: 'restaurant',
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    panNumber: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankAccountHolder: '',
    cuisineTypes: [],
    fssaiLicense: '',
    isPureVeg: false,
    businessCategory: '',
    websiteUrl: '',
  });

  const vendorTypes = [
    {
      type: 'restaurant' as VendorType,
      icon: UtensilsCrossed,
      title: 'Restaurant Partner',
      description: 'Sell food, manage menu & accept orders',
      color: 'from-orange-500 to-red-500'
    },
    {
      type: 'deal_merchant' as VendorType,
      icon: Tag,
      title: 'Deals Merchant',
      description: 'Create deals & offers for customers',
      color: 'from-purple-500 to-pink-500'
    },
    {
      type: 'healthcare_provider' as VendorType,
      icon: Stethoscope,
      title: 'Healthcare Provider',
      description: 'Doctors, clinics & healthcare services',
      color: 'from-blue-500 to-cyan-500'
    },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login first');
        navigate('/vendor/login');
        return;
      }

      // Create vendor record
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          user_id: user.id,
          vendor_type: formData.vendorType,
          business_name: formData.businessName,
          business_email: formData.businessEmail,
          business_phone: formData.businessPhone,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          gst_number: formData.gstNumber,
          pan_number: formData.panNumber,
          bank_account_number: formData.bankAccountNumber,
          bank_ifsc: formData.bankIfsc,
          bank_account_holder: formData.bankAccountHolder,
        })
        .select()
        .single();

      if (vendorError) throw vendorError;

      // Create type-specific details
      if (formData.vendorType === 'restaurant') {
        await supabase.from('restaurant_details').insert({
          vendor_id: vendor.id,
          cuisine_types: formData.cuisineTypes,
          fssai_license: formData.fssaiLicense,
          is_pure_veg: formData.isPureVeg,
        });
      } else if (formData.vendorType === 'deal_merchant') {
        await supabase.from('deal_merchant_details').insert({
          vendor_id: vendor.id,
          business_category: formData.businessCategory,
          website_url: formData.websiteUrl,
        });
      }

      toast.success('Registration submitted! Verification pending.');
      navigate('/vendor/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.vendorType;
      case 2: return formData.businessName && formData.businessPhone && formData.businessEmail;
      case 3: return formData.address && formData.city && formData.pincode;
      case 4: return formData.panNumber;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Vendor Registration</h1>
            <p className="text-sm opacity-80">Step {step} of 5</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1 bg-white/20 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-4">
        {/* Step 1: Choose Vendor Type */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold">What type of vendor are you?</h2>
            <p className="text-muted-foreground text-sm">
              Choose the category that best describes your business
            </p>

            <RadioGroup
              value={formData.vendorType}
              onValueChange={(value) => updateFormData('vendorType', value as VendorType)}
              className="space-y-3"
            >
              {vendorTypes.map((type) => (
                <Card 
                  key={type.type}
                  className={`cursor-pointer transition-all ${
                    formData.vendorType === type.type 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => updateFormData('vendorType', type.type)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <RadioGroupItem value={type.type} id={type.type} className="sr-only" />
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                        <type.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{type.title}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                      {formData.vendorType === type.type && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </motion.div>
        )}

        {/* Step 2: Business Details */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold">Business Details</h2>
            <p className="text-muted-foreground text-sm">
              Tell us about your business
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <div className="relative mt-1">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="businessName"
                    placeholder="Enter business name"
                    className="pl-10"
                    value={formData.businessName}
                    onChange={(e) => updateFormData('businessName', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="businessPhone">Business Phone *</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="businessPhone"
                    placeholder="Enter phone number"
                    className="pl-10"
                    value={formData.businessPhone}
                    onChange={(e) => updateFormData('businessPhone', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="businessEmail">Business Email *</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="businessEmail"
                    type="email"
                    placeholder="Enter email address"
                    className="pl-10"
                    value={formData.businessEmail}
                    onChange={(e) => updateFormData('businessEmail', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Business Description</Label>
                <Textarea 
                  id="description"
                  placeholder="Describe your business..."
                  className="mt-1"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                />
              </div>

              {formData.vendorType === 'restaurant' && (
                <>
                  <div>
                    <Label htmlFor="fssaiLicense">FSSAI License Number</Label>
                    <Input 
                      id="fssaiLicense"
                      placeholder="Enter FSSAI license"
                      className="mt-1"
                      value={formData.fssaiLicense}
                      onChange={(e) => updateFormData('fssaiLicense', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPureVeg"
                      checked={formData.isPureVeg}
                      onChange={(e) => updateFormData('isPureVeg', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="isPureVeg">Pure Vegetarian Restaurant</Label>
                  </div>
                </>
              )}

              {formData.vendorType === 'deal_merchant' && (
                <>
                  <div>
                    <Label htmlFor="businessCategory">Business Category</Label>
                    <Input 
                      id="businessCategory"
                      placeholder="e.g., Spa, Salon, Fitness, etc."
                      className="mt-1"
                      value={formData.businessCategory}
                      onChange={(e) => updateFormData('businessCategory', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="websiteUrl">Website URL (optional)</Label>
                    <Input 
                      id="websiteUrl"
                      placeholder="https://your-website.com"
                      className="mt-1"
                      value={formData.websiteUrl}
                      onChange={(e) => updateFormData('websiteUrl', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 3: Address */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold">Business Address</h2>
            <p className="text-muted-foreground text-sm">
              Where is your business located?
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Full Address *</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea 
                    id="address"
                    placeholder="Enter complete address"
                    className="pl-10"
                    rows={2}
                    value={formData.address}
                    onChange={(e) => updateFormData('address', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input 
                    id="city"
                    placeholder="City"
                    className="mt-1"
                    value={formData.city}
                    onChange={(e) => updateFormData('city', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input 
                    id="state"
                    placeholder="State"
                    className="mt-1"
                    value={formData.state}
                    onChange={(e) => updateFormData('state', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pincode">PIN Code *</Label>
                <Input 
                  id="pincode"
                  placeholder="Enter PIN code"
                  className="mt-1"
                  value={formData.pincode}
                  onChange={(e) => updateFormData('pincode', e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Documents */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold">Business Documents</h2>
            <p className="text-muted-foreground text-sm">
              Required for verification
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="panNumber">PAN Number *</Label>
                <div className="relative mt-1">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="panNumber"
                    placeholder="Enter PAN number"
                    className="pl-10 uppercase"
                    value={formData.panNumber}
                    onChange={(e) => updateFormData('panNumber', e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="gstNumber">GST Number (optional)</Label>
                <div className="relative mt-1">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="gstNumber"
                    placeholder="Enter GST number"
                    className="pl-10 uppercase"
                    value={formData.gstNumber}
                    onChange={(e) => updateFormData('gstNumber', e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <Card className="border-dashed">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Upload Documents</p>
                    <p className="text-xs text-muted-foreground">
                      PAN Card, GST Certificate, FSSAI (for restaurants)
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Choose Files
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Step 5: Bank Details */}
        {step === 5 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold">Bank Details</h2>
            <p className="text-muted-foreground text-sm">
              For receiving settlements
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="bankAccountHolder">Account Holder Name</Label>
                <Input 
                  id="bankAccountHolder"
                  placeholder="Enter account holder name"
                  className="mt-1"
                  value={formData.bankAccountHolder}
                  onChange={(e) => updateFormData('bankAccountHolder', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <div className="relative mt-1">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="bankAccountNumber"
                    placeholder="Enter account number"
                    className="pl-10"
                    value={formData.bankAccountNumber}
                    onChange={(e) => updateFormData('bankAccountNumber', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bankIfsc">IFSC Code</Label>
                <Input 
                  id="bankIfsc"
                  placeholder="Enter IFSC code"
                  className="mt-1 uppercase"
                  value={formData.bankIfsc}
                  onChange={(e) => updateFormData('bankIfsc', e.target.value.toUpperCase())}
                />
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">
                    💡 Bank details are used for weekly/monthly settlements. You can update these later from settings.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step < 5 ? (
            <Button 
              className="flex-1"
              disabled={!canProceed()}
              onClick={() => setStep(step + 1)}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              className="flex-1"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Submitting...' : 'Submit Registration'}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
