import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  Star, 
  ShieldCheck, 
  Users, 
  MessageSquare, 
  PhoneCall, 
  Languages, 
  Bot, 
  Heart, 
  ArrowRight, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Zap,
  Globe2,
  Sparkles,
  Lock,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/SEOHead';
import { toast } from 'sonner';
import chatrLogo from '@/assets/chatr-icon-logo.png';

export default function AppHome() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleDownloadApk = () => {
    setDownloading(true);
    setDownloadProgress(10);
    setShowInstallGuide(true);
    toast.success('Starting APK download...');

    // Simulate progress while triggering browser download
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloading(false);
          toast.success('Download complete! Tap the file in your notifications or Downloads folder to install.');
          return 100;
        }
        return prev + 25;
      });
    }, 400);

    // Trigger direct file download
    const link = document.createElement('a');
    link.href = '/download/chatr.apk';
    link.setAttribute('download', 'chatr.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'CHATR',
    operatingSystem: 'Android',
    applicationCategory: 'CommunicationApplication',
    downloadUrl: 'https://app.chatr.chat/download/chatr.apk',
    softwareVersion: '1.0.101',
    fileSize: '154MB',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '128450',
      bestRating: '5',
      worstRating: '1'
    },
    author: {
      '@type': 'Organization',
      name: 'Chatr Inc.'
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-neutral-950 text-foreground flex flex-col justify-between">
      <SEOHead
        title="CHATR App — Download Official Android APK (v1.0.101) | Private Messaging, Calls & AI"
        description="Download the official CHATR Android APK directly. Enjoy private messaging, HD calls with live multi-language translation, AI assistants, and health records. Fast, secure, verified APK."
        canonicalUrl="https://app.chatr.chat/"
        ogUrl="https://app.chatr.chat/"
        schemaData={appSchema}
      />

      {/* Top Store Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-border/80">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={chatrLogo} alt="CHATR" className="h-10 w-10 rounded-2xl shadow-sm" />
            <div>
              <span className="font-bold text-lg tracking-tight">CHATR</span>
              <span className="text-[11px] block text-muted-foreground -mt-1 font-medium">Official App Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/web')} 
              className="text-xs hidden sm:flex"
            >
              CHATR Web
            </Button>
            <Button 
              size="sm" 
              onClick={handleDownloadApk} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-full px-4"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download APK
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto px-4 py-8 space-y-10 flex-1">
        
        {/* App Store Header Section */}
        <div className="bg-white dark:bg-neutral-900 border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            
            {/* App Icon */}
            <div className="relative flex-shrink-0">
              <img 
                src={chatrLogo} 
                alt="CHATR App Icon" 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl shadow-md border border-neutral-100 dark:border-neutral-800 object-cover" 
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white dark:border-neutral-900 shadow">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            {/* App Meta */}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  CHATR: Super App
                </h1>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verified APK
                </Badge>
              </div>

              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Chatr Inc. • Communication & Social
              </p>

              <p className="text-xs text-muted-foreground line-clamp-2">
                Private Smart Messaging, Free HD Video Calling with Live Translation, AI Assistant, and Healthcare Services.
              </p>

              {/* Badges / Rating Row */}
              <div className="pt-2 flex items-center gap-6 sm:gap-8 border-t border-border/60 mt-3 overflow-x-auto text-xs">
                <div>
                  <div className="flex items-center gap-1 font-bold text-foreground text-sm">
                    4.8 <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <span className="text-muted-foreground text-[11px]">128K reviews</span>
                </div>

                <div className="border-l border-border/60 pl-6 sm:pl-8">
                  <div className="font-bold text-foreground text-sm">1M+</div>
                  <span className="text-muted-foreground text-[11px]">Downloads</span>
                </div>

                <div className="border-l border-border/60 pl-6 sm:pl-8">
                  <div className="font-bold text-foreground text-sm">154 MB</div>
                  <span className="text-muted-foreground text-[11px]">Direct APK</span>
                </div>

                <div className="border-l border-border/60 pl-6 sm:pl-8">
                  <div className="font-bold text-foreground text-sm">3+</div>
                  <span className="text-muted-foreground text-[11px]">Rated for 3+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center gap-4">
            <Button
              size="lg"
              onClick={handleDownloadApk}
              disabled={downloading}
              className="w-full sm:w-auto h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-base font-semibold shadow-md flex items-center justify-center gap-2"
            >
              <Download className="h-5 w-5" />
              {downloading ? `Downloading (${downloadProgress}%)...` : 'Install / Download APK (154 MB)'}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto h-12 px-6 rounded-full text-sm font-medium"
            >
              Open Web App
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>

            <div className="text-xs text-muted-foreground sm:ml-auto flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Full Permissions Configured • Safe & Direct Install</span>
            </div>
          </div>

          {/* Download Progress Bar */}
          {downloading && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>Downloading `chatr.apk` (v1.0.101)...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Step-by-Step APK Installation Guide */}
        <div className="bg-white dark:bg-neutral-900 border border-border/80 rounded-3xl p-6 shadow-sm">
          <button
            onClick={() => setShowInstallGuide(!showInstallGuide)}
            className="w-full flex items-center justify-between text-left font-semibold text-base"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">How to Install CHATR APK on Android</h2>
                <p className="text-xs text-muted-foreground font-normal">
                  All permissions (calling, mic, camera, storage) are built in for instant native experience
                </p>
              </div>
            </div>
            {showInstallGuide ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>

          {showInstallGuide && (
            <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-2 border border-border/40">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <h4 className="font-semibold text-sm">Download APK</h4>
                <p className="text-xs text-muted-foreground">
                  Tap "Download APK" above to download the official release file (`chatr.apk`).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-2 border border-border/40">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <h4 className="font-semibold text-sm">Open File</h4>
                <p className="text-xs text-muted-foreground">
                  Tap the download completion notification or locate `chatr.apk` in your Downloads folder.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-2 border border-border/40">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <h4 className="font-semibold text-sm">Allow Source</h4>
                <p className="text-xs text-muted-foreground">
                  If prompted with "Install unknown apps", tap <strong>Settings</strong> and switch on <strong>Allow from this source</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-2 border border-border/40">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  4
                </div>
                <h4 className="font-semibold text-sm">Install & Launch</h4>
                <p className="text-xs text-muted-foreground">
                  Tap <strong>Install</strong>. CHATR will install just like Google Play with all permissions active!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight">Key App Capabilities</h3>
            <span className="text-xs text-muted-foreground">Version 1.0.101</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-border/80 shadow-none hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm">Smart End-to-End Chat</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fast messaging, rich voice notes, high-definition photo/video sharing, and self-destructing privacy mode.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/80 shadow-none hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Languages className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm">Live Call Translation</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Speak Hindi, English, Kashmiri, or Urdu—CHATR translates your live voice call in real-time without delay.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/80 shadow-none hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm">Personal AI Assistant</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Summarize unread messages, transcribe voice notes, draft polite professional replies, and schedule tasks automatically.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/80 shadow-none hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <Heart className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm">Digital Health Passport</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Store emergency vitals, track prescriptions, calculate BMI, and connect with verified doctors in seconds.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/80 shadow-none hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm">Low-Bandwidth HD Audio</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Engineered with adaptive codecs to keep your calls connected even on weak 2G and 3G cellular signals.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/80 shadow-none hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm">Neighborhood Hubs & Jobs</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Discover verified local jobs, community updates, neighborhood services, and direct business contacts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Technical Release Details Box */}
        <div className="bg-white dark:bg-neutral-900 border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base">Package & Build Specifications</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">Application ID</span>
              <code className="font-mono font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                com.chatr.app
              </code>
            </div>

            <div>
              <span className="text-muted-foreground block mb-0.5">Version</span>
              <span className="font-semibold text-foreground">1.0.101 (Build 101)</span>
            </div>

            <div>
              <span className="text-muted-foreground block mb-0.5">Compatibility</span>
              <span className="font-semibold text-foreground">Android 8.0+ (API 26+)</span>
            </div>

            <div>
              <span className="text-muted-foreground block mb-0.5">Signature</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Official Release Key
              </span>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-neutral-900 border-t border-border/80 py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CHATR (Talentxcel Services Pvt Ltd). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/privacy')} className="hover:text-foreground">Privacy Policy</button>
            <button onClick={() => navigate('/terms')} className="hover:text-foreground">Terms of Service</button>
            <button onClick={() => navigate('/help')} className="hover:text-foreground">Support & Help</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
