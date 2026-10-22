import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Store, 
  TrendingUp, 
  MessageSquare, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Award,
  Zap,
  BarChart3,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/SEOHead';
import chatrLogo from '@/assets/chatr-icon-logo.png';

export default function SellerHome() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('chatr_plus_sellers')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data) {
            setIsSeller(true);
          }
        }
      } catch (err) {
        console.error('Error checking seller:', err);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkUser();
  }, []);

  const sellerSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CHATR+ Seller Hub',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android',
    url: 'https://seller.chatr.chat/',
    description: 'Grow your business with CHATR+ Seller Hub. Accept appointments, chat with customers, and manage payments in one unified merchant portal.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR'
    },
    author: {
      '@type': 'Organization',
      name: 'Talentxcel Services Pvt Ltd',
      url: 'https://chatr.chat'
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-neutral-950 text-foreground flex flex-col justify-between">
      <SEOHead
        title="CHATR+ Seller Portal — Business Management, Bookings & Direct Messaging"
        description="Join CHATR+ as a verified merchant or service provider. Accept customer bookings, manage your digital catalog, chat with buyers, and receive instant settlements."
        canonicalUrl="https://seller.chatr.chat/"
        ogUrl="https://seller.chatr.chat/"
        schemaData={sellerSchema}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-border/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={chatrLogo} alt="CHATR" className="h-10 w-10 rounded-2xl shadow-sm" />
            <div>
              <span className="font-bold text-lg tracking-tight">CHATR+</span>
              <span className="text-[11px] block text-primary font-semibold -mt-1">Seller Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSeller ? (
              <Button 
                onClick={() => navigate('/seller/portal')} 
                className="bg-primary text-primary-foreground font-medium text-xs rounded-full px-5 shadow-sm"
              >
                Go to Dashboard
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/auth?redirect=/seller/portal')}
                  className="text-xs"
                >
                  Seller Sign In
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/chatr-plus/seller-registration')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs rounded-full px-4 shadow-sm"
                >
                  Register as Seller
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl w-full mx-auto px-4 py-12 space-y-16 flex-1">
        
        <div className="text-center space-y-5 max-w-3xl mx-auto pt-4">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Empowering 50,000+ Local Businesses & Professionals
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Grow Your Business with <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">CHATR+ Seller Hub</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The all-in-one platform to sell services, accept online appointments, chat with customers directly, and receive instant payments—with zero technical friction.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={() => navigate('/chatr-plus/seller-registration')}
              className="w-full sm:w-auto h-12 px-8 rounded-full text-base font-semibold shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
            >
              Start Selling on CHATR
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/auth?redirect=/seller/portal')}
              className="w-full sm:w-auto h-12 px-8 rounded-full text-base font-medium"
            >
              Existing Seller Login
            </Button>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zero Setup Fees
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Instant Bank Settlement
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Direct Customer Messaging
            </span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Everything You Need to Run Your Business</h2>
            <p className="text-sm text-muted-foreground">Manage your bookings, catalog, and customer relations from mobile or desktop</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-3xl border-border/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg">Direct Chat Commerce</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect with interested clients via real-time messaging. Share product cards, send customized invoices, and close deals instantly.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg">Automated Bookings</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Let clients view your real-time availability and book slots directly. Automated appointment reminders reduce customer no-shows by 80%.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg">Instant Settlements</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Collect payments seamlessly via UPI, Debit/Credit Cards, and Net Banking. Funds are deposited directly into your linked bank account.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Store className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg">Digital Storefront</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Showcase your catalog, pricing tiers, doctor consultation charges, portfolio photos, and verified reviews on your own link.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg">Actionable Analytics</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track monthly revenue growth, total bookings, customer retention rates, and ratings with our intuitive analytics dashboard.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg">Verified Badge Trust</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Build instant buyer credibility with our official Verified Seller badge, background authentication, and customer ratings.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Categories Section */}
        <div className="bg-white dark:bg-neutral-900 border border-border/80 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold">Built for Every Service & Merchant Business</h3>
            <p className="text-xs text-muted-foreground">Join verified sellers across categories on CHATR</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-border/40">
              <span className="text-2xl mb-1 block">🩺</span>
              <p className="font-semibold text-sm">Doctors & Clinics</p>
              <p className="text-[11px] text-muted-foreground">Teleconsultations & Visits</p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-border/40">
              <span className="text-2xl mb-1 block">🔧</span>
              <p className="font-semibold text-sm">Home & Repair</p>
              <p className="text-[11px] text-muted-foreground">Electricians, Plumbers, HVAC</p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-border/40">
              <span className="text-2xl mb-1 block">💇</span>
              <p className="font-semibold text-sm">Salons & Wellness</p>
              <p className="text-[11px] text-muted-foreground">Beauty, Spas & Fitness</p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-border/40">
              <span className="text-2xl mb-1 block">💼</span>
              <p className="font-semibold text-sm">Professional Services</p>
              <p className="text-[11px] text-muted-foreground">Tutors, Lawyers, Consultants</p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-neutral-900 border-t border-border/80 py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CHATR+ Seller Hub (Talentxcel Services Pvt Ltd). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/privacy')} className="hover:text-foreground">Privacy Policy</button>
            <button onClick={() => navigate('/terms')} className="hover:text-foreground">Seller Terms</button>
            <button onClick={() => navigate('/help')} className="hover:text-foreground">Seller Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
