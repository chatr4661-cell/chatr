import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Smartphone, 
  Monitor, 
  Download as DownloadIcon,
  CheckCircle2,
  MessageCircle,
  Heart,
  Shield,
  Zap
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import logo from '@/assets/chatr-logo.png';

export default function Download() {
  const navigate = useNavigate();
  const appUrl = window.location.origin;

  const features = [
    { icon: MessageCircle, title: 'Instant Messaging', description: 'Chat with anyone, anywhere' },
    { icon: Heart, title: 'Healthcare Platform', description: 'Complete digital health services' },
    { icon: Shield, title: 'Health Passport', description: 'Your medical records in one place' },
    { icon: Zap, title: 'AI Assistant', description: '24/7 health guidance' }
  ];

  const handleDownloadAndroid = () => {
    // In production, this would link to Google Play Store
    window.open('https://play.google.com/store', '_blank');
  };

  const handleDownloadIOS = () => {
    // In production, this would link to Apple App Store
    window.open('https://www.apple.com/app-store/', '_blank');
  };

  const handleOpenWeb = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
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
            Open Web App
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Download Chatr+
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            India's next-gen all-in-one messaging & healthcare platform
          </p>
        </div>

        {/* Download Options */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Mobile Apps */}
          <Card className="bg-card/50 backdrop-blur-glass border-glass-border">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Mobile App</h2>
                  <p className="text-sm text-muted-foreground">For Android & iOS</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleDownloadAndroid}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <DownloadIcon className="mr-2 h-5 w-5" />
                  Download for Android
                </Button>
                
                <Button 
                  onClick={handleDownloadIOS}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  <DownloadIcon className="mr-2 h-5 w-5" />
                  Download for iPhone
                </Button>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-3 pt-4 border-t border-glass-border">
                <p className="text-sm text-muted-foreground">Scan to download on mobile</p>
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG value={appUrl} size={150} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Web App */}
          <Card className="bg-card/50 backdrop-blur-glass border-glass-border">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-accent/10">
                  <Monitor className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Web App</h2>
                  <p className="text-sm text-muted-foreground">Use in your browser</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Access Chatr+ directly from your browser. Works on desktop and mobile.
                </p>

                <Button 
                  onClick={handleOpenWeb}
                  className="w-full"
                  size="lg"
                  variant="default"
                >
                  Open Web App
                </Button>

                <div className="space-y-2 pt-4 border-t border-glass-border">
                  <p className="text-sm font-medium">Features include:</p>
                  <ul className="space-y-2">
                    {['Real-time messaging', 'Voice & video calls', 'Health passport access', 'AI health assistant'].map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
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
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Why Choose Chatr+?</h2>
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

        {/* System Requirements */}
        <Card className="max-w-4xl mx-auto bg-card/50 backdrop-blur-glass border-glass-border">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">System Requirements</h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="font-medium mb-2">Android</p>
                <p className="text-muted-foreground">Android 7.0 or higher</p>
              </div>
              <div>
                <p className="font-medium mb-2">iOS</p>
                <p className="text-muted-foreground">iOS 13.0 or higher</p>
              </div>
              <div>
                <p className="font-medium mb-2">Web</p>
                <p className="text-muted-foreground">Modern browsers (Chrome, Firefox, Safari, Edge)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-2xl font-bold">Ready to get started?</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={handleOpenWeb} size="lg">
              Start Using Chatr+
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
