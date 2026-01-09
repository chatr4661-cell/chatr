import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, AlertTriangle, Phone, MapPin, Heart } from 'lucide-react';
import { Haptics } from '@/utils/haptics';
import { useLocation } from '@/contexts/LocationContext';
import { Capacitor } from '@capacitor/core';

const EmergencyButton = () => {
  const [isActivating, setIsActivating] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { location } = useLocation();

  const activateEmergency = async () => {
    setIsActivating(true);
    setCountdown(3);

    // Haptic feedback
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact('Heavy');
    }

    const timer = setInterval(async () => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          triggerEmergency();
          return null;
        }
        // Haptic feedback on each count
        if (Capacitor.isNativePlatform()) {
          Haptics.impact('Medium');
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
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact('Heavy');
    }

    const locationText = location 
      ? `Location: ${location.city || 'Unknown'} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
      : 'Location unavailable';

    toast({
      title: '🚨 Emergency Alert Sent!',
      description: `Your emergency contacts and nearby healthcare providers have been notified. ${locationText}`,
      duration: 5000
    });

    // In production, this would:
    // - Send SMS to emergency contacts with location
    // - Alert nearby healthcare providers with coordinates
    // - Call emergency services with location data
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
                  const locationText = location 
                    ? `My location: ${location.city || 'Unknown'}\nCoordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\nGoogle Maps: https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                    : 'Location unavailable. Please enable location services.';
                  
                  if (navigator.share) {
                    navigator.share({
                      title: 'Emergency - My Location',
                      text: locationText
                    });
                  } else {
                    navigator.clipboard.writeText(locationText);
                    toast({
                      title: 'Location Copied',
                      description: 'Location copied to clipboard'
                    });
                  }
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
