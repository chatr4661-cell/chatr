import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, AlertTriangle, Phone, MapPin, Heart } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const EmergencyButton = () => {
  const [isActivating, setIsActivating] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const activateEmergency = async () => {
    setIsActivating(true);
    setCountdown(3);

    // Haptic feedback
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.log('Haptics not available');
    }

    const timer = setInterval(async () => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          triggerEmergency();
          return null;
        }
        // Haptic feedback on each count
        try {
          Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) {
          console.log('Haptics not available');
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelEmergency = () => {
    setIsActivating(false);
    setCountdown(null);
    toast({
      title: 'Cancelled',
      description: 'Emergency alert cancelled'
    });
  };

  const triggerEmergency = async () => {
    setIsActivating(false);
    
    // Haptic feedback
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.log('Haptics not available');
    }

    toast({
      title: '🚨 Emergency Alert Sent!',
      description: 'Your emergency contacts and nearby healthcare providers have been notified.',
      duration: 5000
    });

    // In production, this would:
    // - Get user location
    // - Send SMS to emergency contacts
    // - Alert nearby healthcare providers
    // - Call emergency services
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-50 via-background to-red-50 dark:from-red-950/20 dark:via-background dark:to-red-950/20">
      {/* Header */}
      <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-gradient-glass">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Emergency</h1>
            <p className="text-sm text-muted-foreground">Quick access to emergency services</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          {/* Emergency Button */}
          <div className="text-center">
            {isActivating && countdown !== null ? (
              <div className="space-y-4">
                <div className="relative">
                  <div className="w-48 h-48 mx-auto rounded-full bg-red-500 flex items-center justify-center animate-pulse shadow-2xl shadow-red-500/50">
                    <span className="text-6xl font-bold text-white">{countdown}</span>
                  </div>
                </div>
                <p className="text-lg font-semibold text-foreground">Activating Emergency Alert...</p>
                <Button
                  onClick={cancelEmergency}
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={activateEmergency}
                  className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 flex items-center justify-center shadow-2xl shadow-red-500/50 transition-all hover:scale-105 active:scale-95"
                >
                  <AlertTriangle className="w-24 h-24 text-white" />
                </button>
                <div className="space-y-2">
                  <p className="text-xl font-bold text-foreground">Press for Emergency</p>
                  <p className="text-sm text-muted-foreground">Hold to activate emergency alert</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid gap-3">
            <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => {
                  toast({
                    title: 'Calling Emergency Services',
                    description: 'Connecting to 112 (National Emergency Number)...'
                  });
                  // In production: window.location.href = 'tel:112';
                }}
              >
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-foreground">Call Emergency Services</p>
                  <p className="text-sm text-muted-foreground">Dial 112 / 102 (Ambulance) / 100 (Police)</p>
                </div>
              </Button>
            </Card>

            <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => {
                  toast({
                    title: 'Sharing Location',
                    description: 'Sending your location to emergency contacts...'
                  });
                }}
              >
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-foreground">Share Location</p>
                  <p className="text-sm text-muted-foreground">Send to emergency contacts</p>
                </div>
              </Button>
            </Card>

            <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => navigate('/wellness')}
              >
                <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-foreground">Medical History</p>
                  <p className="text-sm text-muted-foreground">View your health data</p>
                </div>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyButton;
