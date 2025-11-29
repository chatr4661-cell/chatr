import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Smartphone, Laptop, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DeviceType = 'web' | 'windows' | 'macos' | 'android' | 'ios';

export default function OSDetection() {
  const navigate = useNavigate();
  const [deviceType, setDeviceType] = useState<DeviceType>('web');

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else if (/windows/.test(userAgent)) {
      setDeviceType('windows');
    } else if (/macintosh|mac os x/.test(userAgent)) {
      setDeviceType('macos');
    } else {
      setDeviceType('web');
    }
  }, []);

  const handleOpenChatrOS = () => {
    navigate('/chatr-os');
  };

  const renderContent = () => {
    switch (deviceType) {
      case 'android':
        return (
          <>
            <Smartphone className="h-32 w-32 text-primary mb-8 animate-pulse" />
            <h1 className="text-6xl font-bold text-foreground mb-4">Chatr OS</h1>
            <p className="text-2xl text-muted-foreground mb-12 max-w-2xl">
              Android Launcher coming soon
            </p>
            <div className="space-y-4">
              <Button 
                size="lg" 
                onClick={handleOpenChatrOS}
                className="text-xl px-12 py-8 h-auto rounded-2xl shadow-2xl bg-gradient-to-r from-teal-500 to-teal-700"
              >
                <ExternalLink className="mr-3 h-6 w-6" />
                Open Chatr OS Web
              </Button>
              <p className="text-sm text-muted-foreground">
                Native Android launcher coming soon. Use the web version for now.
              </p>
            </div>
          </>
        );

      case 'ios':
        return (
          <>
            <Smartphone className="h-32 w-32 text-primary mb-8 animate-pulse" />
            <h1 className="text-6xl font-bold text-foreground mb-4">Chatr OS</h1>
            <p className="text-2xl text-muted-foreground mb-12 max-w-2xl">
              Experience Chatr OS on the web
            </p>
            <Button 
              size="lg" 
              onClick={handleOpenChatrOS}
              className="text-xl px-12 py-8 h-auto rounded-2xl shadow-2xl bg-gradient-to-r from-teal-500 to-teal-700"
            >
              <ExternalLink className="mr-3 h-6 w-6" />
              Open Chatr OS
            </Button>
          </>
        );

      case 'windows':
        return (
          <>
            <Monitor className="h-32 w-32 text-primary mb-8 animate-pulse" />
            <h1 className="text-6xl font-bold text-foreground mb-4">Chatr OS</h1>
            <p className="text-2xl text-muted-foreground mb-12 max-w-2xl">
              Desktop app for Windows coming soon
            </p>
            <div className="space-y-4">
              <Button 
                size="lg" 
                onClick={handleOpenChatrOS}
                className="text-xl px-12 py-8 h-auto rounded-2xl shadow-2xl bg-gradient-to-r from-teal-500 to-teal-700"
              >
                <ExternalLink className="mr-3 h-6 w-6" />
                Open Chatr OS Web
              </Button>
              <p className="text-sm text-muted-foreground">
                Native Windows app coming soon. Use the web version for now.
              </p>
            </div>
          </>
        );

      case 'macos':
        return (
          <>
            <Laptop className="h-32 w-32 text-primary mb-8 animate-pulse" />
            <h1 className="text-6xl font-bold text-foreground mb-4">Chatr OS</h1>
            <p className="text-2xl text-muted-foreground mb-12 max-w-2xl">
              Desktop app for macOS coming soon
            </p>
            <div className="space-y-4">
              <Button 
                size="lg" 
                onClick={handleOpenChatrOS}
                className="text-xl px-12 py-8 h-auto rounded-2xl shadow-2xl bg-gradient-to-r from-teal-500 to-teal-700"
              >
                <ExternalLink className="mr-3 h-6 w-6" />
                Open Chatr OS Web
              </Button>
              <p className="text-sm text-muted-foreground">
                Native macOS app coming soon. Use the web version for now.
              </p>
            </div>
          </>
        );

      default:
        return (
          <>
            <Monitor className="h-32 w-32 text-primary mb-8 animate-pulse" />
            <h1 className="text-6xl font-bold text-foreground mb-4">Chatr OS</h1>
            <p className="text-2xl text-muted-foreground mb-12 max-w-2xl">
              Your desktop operating system experience
            </p>
            <Button 
              size="lg" 
              onClick={handleOpenChatrOS}
              className="text-xl px-12 py-8 h-auto rounded-2xl shadow-2xl bg-gradient-to-r from-teal-500 to-teal-700"
            >
              <ExternalLink className="mr-3 h-6 w-6" />
              Launch Chatr OS
            </Button>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/10 flex items-center justify-center p-8">
      <div className="text-center flex flex-col items-center animate-fade-in">
        {renderContent()}
        
        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-border/50 text-center">
          <p className="text-muted-foreground">
            Chatr OS • A new way to experience apps
          </p>
        </div>
      </div>
    </div>
  );
}
