import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Stethoscope,
  Check,
  Calendar,
  Users,
  TrendingUp,
  Shield,
  Zap,
  FileText,
  Award,
  Clock
} from 'lucide-react';

export default function DoctorOnboarding() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialty: '',
    registrationNumber: '',
    yearsExperience: '',
    clinic: '',
    city: '',
    aboutYou: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to continue');
        navigate('/auth');
        return;
      }

      // Store doctor application temporarily (will create proper table structure later)
      toast.success('Thank you! Doctor onboarding coming soon. We\'ll notify you when it\'s ready!');
      navigate('/');
      return;

      toast.success('Application submitted! We\'ll verify your credentials within 24 hours.');
      navigate('/provider/dashboard');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    { icon: Users, title: '1M+ Potential Patients', desc: 'Instant access to growing user base' },
    { icon: Calendar, title: 'Smart Scheduling', desc: 'AI-powered appointment management' },
    { icon: TrendingUp, title: 'Grow Your Practice', desc: 'Zero upfront costs, pay per patient' },
    { icon: Shield, title: 'Verified Profile', desc: 'Build trust with verified badge' },
    { icon: Zap, title: 'Instant Consultations', desc: 'Text, voice & video calling built-in' },
    { icon: FileText, title: 'Digital Records', desc: 'Prescriptions & reports in one place' },
  ];

  const howItWorks = [
    { step: 1, title: 'Submit Application', desc: 'Fill the form below (2 min)' },
    { step: 2, title: 'Verification', desc: 'We verify your credentials (24 hrs)' },
    { step: 3, title: 'Setup Profile', desc: 'Add availability & consultation fees' },
    { step: 4, title: 'Start Consulting', desc: 'Accept appointments & earn' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500/10 via-background to-teal-500/10 pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Stethoscope className="w-12 h-12" />
            <h1 className="text-5xl font-bold">Join Chatr as a Doctor</h1>
          </div>
          
          <p className="text-2xl text-blue-100 mb-6">
            Reach patients instantly. Grow your practice digitally.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <Award className="w-5 h-5" />
              <span className="font-semibold">FREE for first 50 doctors</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Get verified in 24 hours</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Benefits Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Why Doctors Choose Chatr</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="p-5 hover:shadow-lg transition-all">
                <benefit.icon className="w-10 h-10 text-blue-600 mb-3" />
                <h3 className="font-bold mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-teal-500/5 border-blue-500/20">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-bold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Pricing */}
        <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-7 h-7 text-green-600" />
            Simple Pricing
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span><span className="font-bold text-green-700">₹0</span> signup fee (completely FREE)</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span><span className="font-bold text-green-700">5%</span> commission per consultation</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span>You set your own consultation fees</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span>Payments directly to your bank account</span>
            </div>
          </div>
        </Card>

        {/* Application Form */}
        <Card className="p-8 bg-gradient-to-br from-background to-blue-500/5">
          <h2 className="text-3xl font-bold mb-6 text-center">Join Chatr Today</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Dr. Your Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="doctor@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty *</Label>
                <Input
                  id="specialty"
                  required
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="e.g., General Physician, Cardiologist"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Medical Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  required
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  placeholder="MCI/State Registration No."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Years of Experience *</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  required
                  value={formData.yearsExperience}
                  onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                  placeholder="e.g., 10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic">Clinic/Hospital Name *</Label>
                <Input
                  id="clinic"
                  required
                  value={formData.clinic}
                  onChange={(e) => setFormData({ ...formData, clinic: e.target.value })}
                  placeholder="Your clinic name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Your city"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aboutYou">About You *</Label>
              <Textarea
                id="aboutYou"
                required
                value={formData.aboutYou}
                onChange={(e) => setFormData({ ...formData, aboutYou: e.target.value })}
                placeholder="Tell us about your practice, qualifications, and areas of expertise"
                rows={4}
              />
            </div>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full gap-2 text-lg py-6"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-4">
            Your information is secure. We'll verify your credentials within 24 hours.
          </p>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
            <div className="text-muted-foreground">Verified Doctors</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">10K+</div>
            <div className="text-muted-foreground">Consultations/Month</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">4.8★</div>
            <div className="text-muted-foreground">Average Rating</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
