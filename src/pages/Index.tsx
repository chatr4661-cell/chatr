import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountryCodeSelector } from '@/components/CountryCodeSelector';
import { PINInput } from '@/components/PINInput';
import { Sparkles, Shield, CheckCircle2 } from 'lucide-react';
import logo from '@/assets/chatr-logo.png';

const Index = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/chat');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/chat');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleContinue = () => {
    if (phoneNumber.length >= 10) {
      setStep('pin');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent opacity-90" />
      <div className="absolute inset-0" style={{ backgroundImage: 'var(--gradient-mesh)' }} />
      
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-between p-6 pb-8">
        {/* Header Section */}
        <div className="w-full max-w-md text-center space-y-3 pt-12">
          <img src={logo} alt="Chatr" className="h-16 mx-auto drop-shadow-lg" />
          <p className="text-lg text-gray-900 font-medium">Say it. Share it. Live it.</p>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-md space-y-6">
          {step === 'phone' ? (
            <>
              {/* Welcome Message */}
              <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Welcome to Chatr</h1>
                <p className="text-xl font-semibold text-gray-800">Secure. Smart. Simple.</p>
                <p className="text-base text-gray-700">Connect instantly with privacy and AI-powered messaging.</p>
              </div>

              {/* AI Features Card */}
              <div className="glass-card p-6 space-y-4 bg-white/80 backdrop-blur-xl border-white/50 rounded-3xl">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">AI-Smart Messaging</h3>
                    <p className="text-sm text-gray-700">Auto-summaries, smart replies, and reminders so you never lose track</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Privacy First</h3>
                    <p className="text-sm text-gray-700">End-to-end encrypted</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Built for Life + Work</h3>
                    <p className="text-sm text-gray-700">Turn messages into tasks, notes, or meeting reminders instantly</p>
                  </div>
                </div>
              </div>

              {/* Phone Input */}
              <div className="glass-card p-6 space-y-4 bg-white/90 backdrop-blur-xl border-white/50 rounded-3xl">
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium">Enter your phone number</Label>
                  <div className="flex gap-2">
                    <CountryCodeSelector
                      value={countryCode}
                      onChange={setCountryCode}
                    />
                    <Input
                      type="tel"
                      placeholder="XXXXX XXXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 rounded-2xl h-12 text-base text-gray-900"
                      maxLength={10}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleContinue}
                  disabled={phoneNumber.length < 10 || isLoading}
                  className="w-full h-12 rounded-full text-base font-semibold"
                >
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* PIN Input Screen */}
              <div className="glass-card p-8 space-y-6 bg-white/90 backdrop-blur-xl border-white/50 rounded-3xl">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">Enter PIN</h2>
                  <p className="text-sm text-gray-600">for smart chatr messaging</p>
                </div>

                <div className="space-y-4">
                  <Label className="text-gray-900 font-medium">Enter Your PIN</Label>
                  <PINInput
                    length={6}
                    onComplete={(pin) => {
                      console.log('PIN entered:', pin);
                      // Handle PIN authentication here
                      navigate('/chat');
                    }}
                  />
                </div>

                <div className="text-center">
                  <button
                    onClick={() => setStep('phone')}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
                  >
                    New user? Register on this page
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-gray-900 font-medium">Secure messaging for everyone 🌐</p>
          <p className="text-sm text-gray-700">© 2025 Chatr.chat</p>
        </div>
      </div>
    </div>
  );
};

export default Index;