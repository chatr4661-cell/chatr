import { useState, useEffect } from 'react';
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
  Download as DownloadIcon,
  Sparkles,
  ArrowDown,
  Share2
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { triggerOneTapInstall, downloadAndroidAPK, isPWA, APK_DOWNLOAD_URL } from '@/utils/pwaUtils';
import { toast } from 'sonner';

export default function Download() {
  const navigate = useNavigate();
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIOSFloatingPointer, setShowIOSFloatingPointer] = useState(false);
  const [showAndroidFloatingPointer, setShowAndroidFloatingPointer] = useState(false);
  const [downloadingAPK, setDownloadingAPK] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));
  }, []);

  const features = [
    { icon: MessageCircle, title: 'Instant Messaging', description: 'Private, end-to-end encrypted messaging with zero trackers.' },
    { icon: Heart, title: 'Healthcare Platform', description: 'Digital health passport, appointments, and vitals.' },
    { icon: Shield, title: 'Live Call Translation', description: 'Translate multi-language voice and video calls in real time.' },
    { icon: Zap, title: 'AI Assistant', description: '24/7 personal intelligence and automated chat assistance.' }
  ];

  const handleOpenWeb = () => {
    navigate('/web');
  };

  const handleDownloadAPK = () => {
    setDownloadingAPK(true);
    toast.success('Starting APK download (chatr-plus.apk)...');
    downloadAndroidAPK();
    setTimeout(() => setDownloadingAPK(false), 3000);
  };

  const handleInstallAndroidPWA = async () => {
    try {
      const res = await triggerOneTapInstall();
      if (res.type === 'prompt' && res.success) {
        toast.success('Chatr+ installed successfully! 🎉');
      } else {
        setShowAndroidFloatingPointer(true);
        setTimeout(() => setShowAndroidFloatingPointer(false), 9000);
      }
    } catch {
      setShowAndroidFloatingPointer(true);
      setTimeout(() => setShowAndroidFloatingPointer(false), 9000);
    }
  };

  const handleInstallIOS = () => {
    setShowIOSFloatingPointer(true);
    setTimeout(() => setShowIOSFloatingPointer(false), 10000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 relative">
      <SEOHead
        title="Download CHATR+ — Android APK, iOS & Web Apps"
        description="Download CHATR+ for Android (direct APK & Web App), install on iPhone (iOS), or access CHATR Web instantly on your browser with encrypted calling and health vitals."
        canonicalUrl="https://chatr.chat/download"
      />

      {/* iOS Floating Bouncing Pointer Tooltip */}
      {showIOSFloatingPointer && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] w-[92%] max-w-sm animate-in fade-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-blue-500/40 backdrop-blur-xl flex items-center justify-between gap-3 ring-4 ring-blue-500/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-500/20 text-cyan-400 shrink-0">
                <ArrowDown className="h-5 w-5 animate-bounce" />
              </div>
              <div className="text-xs leading-tight">
                <p className="font-bold text-white text-sm">
                  Tap <span className="text-cyan-400 font-extrabold">[⬆️ Share]</span> in Safari
                </p>
                <p className="text-slate-300 mt-0.5">
                  then choose <strong className="text-white">"Add to Home Screen"</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSFloatingPointer(false)}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
              aria-label="Dismiss pointer"
            >
              ✕
            </button>
          </div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-slate-900 mx-auto -mt-0.5 filter drop-shadow-md"></div>
        </div>
      )}

      {/* Android Top-Right Floating Pointer Tooltip */}
      {showAndroidFloatingPointer && (
        <div className="fixed top-3 right-3 z-[10000] max-w-xs animate-in fade-in slide-in-from-top duration-300">
          <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-xl flex items-start gap-3 ring-4 ring-emerald-500/20">
            <div className="text-xs leading-tight min-w-0">
              <p className="font-bold text-white text-sm">
                Tap <span className="text-emerald-400 font-extrabold">menu [⋮]</span> top-right
              </p>
              <p className="text-slate-300 mt-1">
                Select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>
              </p>
            </div>
            <button
              onClick={() => setShowAndroidFloatingPointer(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white shrink-0"
              aria-label="Dismiss prompt"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate('/')}>
              <span className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">
                chatr<span className="text-[#00D084] font-black">+</span>
              </span>
            </div>
          </div>
          <Button onClick={handleOpenWeb} variant="outline" className="font-semibold">
            Open CHATR Web
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3 py-6 sm:py-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Universal Multi-Device Access</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Get CHATR<span className="text-[#00D084] font-black">+</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Download the native APK for Android, install 1-tap on iPhone, or use instantly in your computer browser.
          </p>
        </div>

        {/* Access Options Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          
          {/* Card 1: Android App */}
          <Card className="bg-card/70 backdrop-blur-glass border-glass-border relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-4 right-4">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3 h-3" />
                Ready to Install
              </span>
            </div>

            <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M3.6 1.8l9.6 9.6-9.6 9.6c-.4-.4-.6-1-.6-1.7V3.5c0-.7.2-1.3.6-1.7z" />
                      <path fill="#34A853" d="M16.5 14.7l-3.3-3.3-9.6 9.6c.3.2.7.3 1.2.3.8 0 1.6-.4 2.2-.8l9.5-5.8z" />
                      <path fill="#FBBC05" d="M19.7 11.2l-3.2-1.9-3.3 2.1 3.3 3.3 3.2-1.9c.7-.4 1.1-1 1.1-1.6s-.4-1.2-1.1-1.6z" />
                      <path fill="#EA4335" d="M3.6 1.8l9.6 9.6 3.3-2.1-9.5-5.8C6.4 3.1 5.6 2.7 4.8 2.7c-.5 0-.9.1-1.2.3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Android App</h2>
                    <p className="text-xs text-muted-foreground">Native APK &amp; WebAPK</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Direct Android package with background push notifications, WebRTC calling, and instant startup.
                </p>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Package Size:</span>
                    <strong className="text-foreground">174.8 MB</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Target OS:</span>
                    <strong className="text-foreground">Android 8.0+</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Security:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">SHA-256 Verified</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-glass-border">
                <Button 
                  onClick={handleDownloadAPK}
                  disabled={downloadingAPK}
                  className="w-full py-5 text-sm font-bold bg-[#093E32] hover:bg-[#072F26] text-white shadow-md flex items-center justify-center gap-2"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>{downloadingAPK ? 'Downloading APK...' : 'Download Android APK'}</span>
                </Button>

                <Button 
                  onClick={handleInstallAndroidPWA}
                  variant="outline"
                  className="w-full text-xs font-semibold border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Install Android Web App (1-Tap)</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: iPhone & iPad (iOS) */}
          <Card className="bg-card/70 backdrop-blur-glass border-glass-border relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-4 right-4">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3 h-3" />
                iOS Ready
              </span>
            </div>

            <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 shrink-0">
                    <svg className="w-6 h-6 fill-current text-gray-900 dark:text-white" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.7-7.94-12-14.58-6.19-9.5-11.05-20.73-14.58-33.68-3.53-12.96-5.3-25.2-5.3-36.72 0-14.34 3.75-26.33 11.24-35.96 7.49-9.63 16.89-14.57 28.21-14.81 4.58 0 9.87 1.25 15.86 3.74 6 2.49 9.94 3.8 11.83 3.94 2.87-.23 7.02-1.63 12.44-4.21 5.43-2.58 10.27-3.76 14.53-3.53 10.88.58 19.86 4.6 26.94 12.06-9.69 5.86-14.43 14.07-14.21 24.63.22 8.35 3.4 15.35 9.53 21 6.13 5.65 13.51 8.87 22.14 9.66-2.02 6.06-4.39 12.21-7.11 18.45zM119.22 33.15c0-7.3 2.66-14.15 7.97-20.55 5.32-6.4 11.81-10.42 19.49-12.07.21 1.06.32 2.06.32 3 0 7.33-2.73 14.28-8.2 20.85-5.46 6.57-12.03 10.43-19.7 11.59-.11-1.04-.18-1.98-.18-2.82z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">iPhone &amp; iPad</h2>
                    <p className="text-xs text-muted-foreground">iOS Web App &amp; Web Push</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Add to your iPhone Home Screen via Safari for instant full-screen calling, zero App Store friction, and push alerts.
                </p>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Compatibility:</span>
                    <strong className="text-foreground">iOS 16.4+ (Safari)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Installation:</span>
                    <strong className="text-foreground">Add to Home Screen</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Web Push:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">Supported</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-glass-border">
                <Button 
                  onClick={handleInstallIOS}
                  className="w-full py-5 text-sm font-bold bg-[#0F172A] hover:bg-slate-800 text-white shadow-md flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Install for iPhone (Add to Home)</span>
                </Button>

                <Button 
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="w-full text-xs font-semibold border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                >
                  <span>Open in Safari Browser</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: CHATR Web */}
          <Card className="bg-card/70 backdrop-blur-glass border-glass-border relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-4 right-4">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3 h-3" />
                Available Now
              </span>
            </div>

            <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 shrink-0">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">CHATR Web</h2>
                    <p className="text-xs text-muted-foreground">Desktop, Laptop &amp; Tablet</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Access CHATR+ right inside your computer browser. Real-time sync with your phone using WhatsApp-style QR login.
                </p>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Browsers:</span>
                    <strong className="text-foreground">Chrome, Edge, Safari, Firefox</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Setup:</span>
                    <strong className="text-foreground">Zero Installation</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sync:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">QR Code &amp; Phone OTP</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-glass-border">
                <Button 
                  onClick={handleOpenWeb}
                  className="w-full py-5 text-sm font-bold bg-[#093E32] hover:bg-[#072F26] text-white shadow-md flex items-center justify-center gap-2"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Launch CHATR Web</span>
                </Button>

                <Button 
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="w-full text-xs font-semibold border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                >
                  <span>Sign In with Phone Number</span>
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Features Grid */}
        <div className="max-w-5xl mx-auto pt-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-[#0F172A] dark:text-white mb-6">
            Why Choose CHATR+?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card/50 backdrop-blur-glass border-glass-border">
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="p-2.5 rounded-xl bg-primary/10 w-fit text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3 py-6 max-w-xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white">
            Ready to get started?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Sign up with your phone number. No passwords or email verifications needed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button onClick={() => navigate('/auth')} size="lg" className="w-full sm:w-auto px-7 py-5 text-sm font-bold bg-[#093E32] hover:bg-[#072F26] text-white shadow-md">
              Start Free on Chatr+
            </Button>
            <Button onClick={handleDownloadAPK} variant="outline" size="lg" className="w-full sm:w-auto px-6 py-5 text-sm font-semibold border-gray-300">
              <DownloadIcon className="w-4 h-4 mr-2" />
              Direct APK Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
