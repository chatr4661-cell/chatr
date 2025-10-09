import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import logo from '@/assets/chatr-logo.png';
import { Upload, Loader2 } from 'lucide-react';

interface Specialization {
  id: string;
  name: string;
  description: string | null;
}

const ProviderRegister = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  
  // Step 1: Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Step 2: Business Details
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  
  // Step 3: Documents
  const [documents, setDocuments] = useState<File[]>([]);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStep(2); // Skip to business details if already logged in
      }
    });

    // Load specializations
    loadSpecializations();
  }, []);

  const loadSpecializations = async () => {
    const { data, error } = await supabase
      .from('specializations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading specializations:', error);
      return;
    }

    setSpecializations(data || []);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/provider-register`
        }
      });

      if (error) throw error;

      toast({
        title: 'Account created!',
        description: 'Please complete your provider profile.',
      });
      
      setStep(2);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessDetails = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSpecializations.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one specialization',
        variant: 'destructive',
      });
      return;
    }

    setStep(3);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to complete registration');
      }

      // Upload documents if any
      let documentUrls: string[] = [];
      if (documents.length > 0) {
        for (const doc of documents) {
          const fileExt = doc.name.split('.').pop();
          const fileName = `${user.id}/${Math.random()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('provider-certificates')
            .upload(fileName, doc);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('provider-certificates')
            .getPublicUrl(fileName);

          documentUrls.push(publicUrl);
        }
      }

      // Create service provider record
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .insert({
          user_id: user.id,
          business_name: businessName,
          description,
          address,
          document_urls: documentUrls,
          is_verified: false, // Requires admin approval
        })
        .select()
        .single();

      if (providerError) throw providerError;

      // Add specializations
      const specializationInserts = selectedSpecializations.map(specId => ({
        provider_id: providerData.id,
        specialization_id: specId
      }));

      const { error: specError } = await supabase
        .from('provider_specializations')
        .insert(specializationInserts);

      if (specError) throw specError;

      toast({
        title: 'Registration Complete!',
        description: 'Your provider profile is pending verification. You will be notified once approved.',
      });

      navigate('/provider-portal');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialization = (specId: string) => {
    setSelectedSpecializations(prev =>
      prev.includes(specId)
        ? prev.filter(id => id !== specId)
        : [...prev, specId]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background/50 backdrop-blur-3xl" />
      
      <Card className="w-full max-w-2xl relative backdrop-blur-glass bg-gradient-glass border-glass-border shadow-glass rounded-3xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center">
            <img src={logo} alt="chatr+ Logo" className="h-20 object-contain" />
          </div>
          <CardTitle className="text-2xl">Provider Registration</CardTitle>
          <CardDescription className="text-base">
            {step === 1 && 'Create your account'}
            {step === 2 && 'Tell us about your business'}
            {step === 3 && 'Upload verification documents'}
          </CardDescription>
          <div className="flex justify-center gap-2">
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="provider@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base rounded-xl bg-background/50 backdrop-blur-sm border-glass-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 text-base rounded-xl bg-background/50 backdrop-blur-sm border-glass-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 text-base rounded-xl bg-background/50 backdrop-blur-sm border-glass-border"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base rounded-xl shadow-glow"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl"
                onClick={() => navigate('/auth')}
              >
                Already have an account? Sign in
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleBusinessDetails} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Your Practice or Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="h-12 text-base rounded-xl bg-background/50 backdrop-blur-sm border-glass-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about your services and expertise"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="text-base rounded-xl bg-background/50 backdrop-blur-sm border-glass-border resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Business Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="h-12 text-base rounded-xl bg-background/50 backdrop-blur-sm border-glass-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Specializations</Label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-4 rounded-xl bg-background/30 border border-glass-border">
                  {specializations.map((spec) => (
                    <div key={spec.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={spec.id}
                        checked={selectedSpecializations.includes(spec.id)}
                        onCheckedChange={() => toggleSpecialization(spec.id)}
                      />
                      <label
                        htmlFor={spec.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {spec.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 text-base rounded-xl shadow-glow"
                >
                  Continue
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documents">Verification Documents (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Upload professional certificates, licenses, or credentials. This helps speed up verification.
                </p>
                <div className="relative">
                  <Input
                    id="documents"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                    className="h-24 text-base rounded-xl bg-background/50 backdrop-blur-sm border-glass-border file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {documents.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload files</p>
                    </div>
                  )}
                </div>
                {documents.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {documents.length} file(s) selected
                  </div>
                )}
              </div>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm">
                  <strong>Note:</strong> Your profile will be reviewed by our admin team before activation. You'll receive a notification once approved.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 text-base rounded-xl shadow-glow"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete Registration'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderRegister;
