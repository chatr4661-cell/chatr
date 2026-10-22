import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  MessageCircle, 
  Heart, 
  Shield, 
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import logo from '@/assets/chatr-logo.png';

export default function Download() {
  const navigate = useNavigate();

  const features = [
    { icon: MessageCircle, title: 'Instant Messaging', description: 'Private, end-to-end encrypted messaging with zero trackers.' },
    { icon: Heart, title: 'Healthcare Platform', description: 'Digital health passport, appointments, and vitals.' },
    { icon: Shield, title: 'Live Call Translation', description: 'Translate multi-language voice and video calls in real time.' },
    { icon: Zap, title: 'AI Assistant', description: '24/7 personal intelligence and automated chat assistance.' }
  ];

  const handleOpenWeb = () => {
    navigate('/web');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <SEOHead
        title="Download CHATR — CHATR Web & Mobile Apps"
        description="Access CHATR Web instantly on your browser. Native Android and iOS apps are coming soon with end-to-end encryption, calling, and health features."
        canonicalUrl="https://chatr.chat/download"
      />

      {/* Header */}
      <div className="p-4 backdrop-blur-glass bg-gradient-glass border-b border-glass-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logo} alt="chatr+ Logo" className="h-8 object-contain" />
          </div>
          <Button onClick={handleOpenWeb} variant="outline">
            Open CHATR Web
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Get CHATR
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            All-in-one messaging, calling, and healthcare platform
          </p>
        </div>

        {/* Access Options Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
          
          {/* Mobile Apps Card — COMING SOON BANNER */}
          <Card className="bg-card/50 backdrop-blur-glass border-glass-border relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
                <Clock className="w-3.5 h-3.5" />
                Coming Soon
              </span>
            </div>

            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Smartphone className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Android &amp; iOS Apps</h2>
                  <p className="text-sm text-muted-foreground">Native Mobile Experience</p>
                </div>
              </div>

              {/* Coming Soon Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-base">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>Mobile Apps Coming Soon</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We are currently finalizing and polishing the native CHATR Android and iOS mobile app releases. Direct APK and app store releases will be available shortly after testing!
                </p>
                <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>In active development &amp; final quality certification</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Official Google Play &amp; Apple App Store releases ahead</span>
                  </div>
                </div>
              </div>

              {/* Web Reassurance */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  In the meantime, you can use CHATR immediately on any phone, tablet, or computer browser with zero installation:
                </p>
                <Button 
                  onClick={handleOpenWeb}
                  variant="outline"
                  className="w-full text-sm font-semibold border-primary/30 text-primary hover:bg-primary/10"
                >
                  Use CHATR Web on Mobile / Desktop
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CHATR Web Card — ACTIVE & AVAILABLE NOW */}
          <Card className="bg-card/50 backdrop-blur-glass border-glass-border relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Available Now
              </span>
            </div>

            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-accent/10">
                  <Monitor className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">CHATR Web</h2>
                  <p className="text-sm text-muted-foreground">Use in your computer or mobile browser</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Access CHATR directly on desktop and mobile browsers. Syncs in real time with your phone using WhatsApp-style QR code or direct phone login.
                </p>

                <Button 
                  onClick={handleOpenWeb}
                  className="w-full py-6 text-base font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                  variant="default"
                >
                  Open CHATR Web
                </Button>

                <div className="space-y-2 pt-4 border-t border-glass-border">
                  <p className="text-sm font-medium">Web Features:</p>
                  <ul className="space-y-2">
                    {[
                      'Instant phone & QR code authentication',
                      'Zero-delay message synchronization',
                      'Full keyboard navigation & search',
                      'Voice & video calling in browser'
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Features Grid */}
        <div className="max-w-4xl mx-auto pt-4">
          <h2 className="text-2xl font-bold text-center mb-6">Why Choose CHATR?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card/50 backdrop-blur-glass border-glass-border">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-2xl font-bold">Ready to get started?</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Launch CHATR Web in your browser today with zero installation required.
          </p>
          <div className="flex justify-center">
            <Button onClick={handleOpenWeb} size="lg" className="px-8 py-6 text-base font-bold shadow-lg">
              Launch CHATR Web
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
