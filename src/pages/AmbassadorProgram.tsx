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
  Star,
  Trophy,
  Zap,
  Gift,
  Users,
  TrendingUp,
  Check,
  ArrowRight,
  GraduationCap,
  Building2,
  Sparkles
} from 'lucide-react';

export default function AmbassadorProgram() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    college: '',
    year: '',
    city: '',
    experience: '',
    socialMedia: '',
    whyJoin: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to apply');
        navigate('/auth');
        return;
      }

      // Store ambassador application
      const { error } = await supabase
        .from('ambassador_applications')
        .insert({
          user_id: user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          college: formData.college,
          year: formData.year,
          city: formData.city,
          experience: formData.experience,
          social_media: formData.socialMedia,
          why_join: formData.whyJoin,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Application submitted successfully! We\'ll review it within 48 hours.');
      navigate('/growth');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    { icon: Zap, title: '5,000 Bonus Coins', desc: 'Instant ₹500 on approval' },
    { icon: Gift, title: 'Exclusive Merch', desc: 'Branded swag & premium access' },
    { icon: Trophy, title: 'Monthly Rewards', desc: 'Top performers get ₹5,000+' },
    { icon: Users, title: 'Network Building', desc: 'Connect with 100+ ambassadors' },
    { icon: TrendingUp, title: 'Skill Development', desc: 'Marketing & leadership training' },
    { icon: Star, title: 'Certificate', desc: 'Official recognition + LinkedIn badge' },
  ];

  const perks = [
    '500 coins per signup (direct referrals)',
    'Unlimited earning potential from 4-level network',
    'Early access to new features',
    'Direct line to Chatr team',
    'Monthly ambassador meetups (virtual)',
    'Performance-based bonuses up to ₹10,000/month',
    'Internship opportunities at Chatr',
    'Build your personal brand'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500/10 via-background to-pink-500/10 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Button
            variant="ghost"
            size="sm"
            className="text-white mb-6 hover:bg-white/20"
            onClick={() => navigate('/growth')}
          >
            ← Back
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-12 h-12" />
            <h1 className="text-5xl font-bold">Campus Ambassador Program</h1>
          </div>
          
          <p className="text-2xl text-purple-100 mb-6">
            Lead the health revolution at your campus
          </p>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">100+ colleges already joined</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">₹50,000+ earned by top ambassadors</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Benefits Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Why Become an Ambassador?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="p-5 hover:shadow-lg transition-all">
                <benefit.icon className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-bold mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Perks List */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-pink-500/5 border-primary/20">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Gift className="w-7 h-7 text-primary" />
            What You'll Get
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {perks.map((perk, index) => (
              <div key={index} className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{perk}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Requirements */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" />
            Requirements
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary mt-0.5" />
              <span>Currently enrolled in college/university</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary mt-0.5" />
              <span>Active on social media (Instagram/LinkedIn)</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary mt-0.5" />
              <span>Passionate about health & technology</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary mt-0.5" />
              <span>Good communication skills</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary mt-0.5" />
              <span>Commitment of 5-10 hours/week</span>
            </div>
          </div>
        </Card>

        {/* Application Form */}
        <Card className="p-8 bg-gradient-to-br from-background to-primary/5">
          <h2 className="text-3xl font-bold mb-6 text-center">Apply Now</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter your full name"
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
                  placeholder="your.email@college.edu"
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
                <Label htmlFor="college">College/University *</Label>
                <Input
                  id="college"
                  required
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  placeholder="Your college name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year of Study *</Label>
                <Input
                  id="year"
                  required
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="e.g., 2nd Year"
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
              <Label htmlFor="socialMedia">Social Media Handles</Label>
              <Input
                id="socialMedia"
                value={formData.socialMedia}
                onChange={(e) => setFormData({ ...formData, socialMedia: e.target.value })}
                placeholder="Instagram: @yourhandle, LinkedIn: linkedin.com/in/yourprofile"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Previous Marketing/Leadership Experience</Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="Tell us about any clubs, events, or campaigns you've been part of"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whyJoin">Why do you want to be a Chatr Ambassador? *</Label>
              <Textarea
                id="whyJoin"
                required
                value={formData.whyJoin}
                onChange={(e) => setFormData({ ...formData, whyJoin: e.target.value })}
                placeholder="Share your motivation and ideas"
                rows={4}
              />
            </div>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full gap-2 text-lg py-6"
              disabled={submitting}
            >
              {submitting ? (
                'Submitting...'
              ) : (
                <>
                  Submit Application <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-4">
            We'll review your application within 48 hours
          </p>
        </Card>

        {/* Success Stories */}
        <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-green-600" />
            Ambassador Success Stories
          </h2>
          <div className="space-y-4">
            <div className="bg-background/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                  #1 Top Performer
                </div>
                <div>
                  <div className="font-semibold">Priya S. - IIT Delhi</div>
                  <div className="text-sm text-muted-foreground">Earned ₹1,23,000 in 3 months | 247 direct referrals</div>
                </div>
              </div>
            </div>
            <div className="bg-background/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                  Rising Star
                </div>
                <div>
                  <div className="font-semibold">Rahul M. - NIT Trichy</div>
                  <div className="text-sm text-muted-foreground">Earned ₹67,500 in 1 month | Network of 1,200+</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
