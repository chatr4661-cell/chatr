import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MerchantSetup } from '@/components/dhandha/MerchantSetup';
import { VoiceBillingCard } from '@/components/dhandha/VoiceBillingCard';
import { DhandhaDashboard } from '@/components/dhandha/DhandhaDashboard';

interface MerchantProfile {
  id: string;
  upi_id: string;
  business_name: string | null;
}

const Dhandha = () => {
  const navigate = useNavigate();
  const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkMerchantProfile();
  }, []);

  const checkMerchantProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('merchant_profiles')
        .select('id, upi_id, business_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setMerchantProfile(data);
      }
    } catch (error) {
      console.error('Error checking merchant profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = () => {
    checkMerchantProfile();
  };

  const handleTransactionCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show setup screen if no merchant profile
  if (!merchantProfile) {
    return <MerchantSetup onComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">
                {merchantProfile.business_name || 'My Dhandha'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {merchantProfile.upi_id}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Voice Billing Card */}
        <VoiceBillingCard 
          merchantProfile={merchantProfile}
          onTransactionCreated={handleTransactionCreated}
        />

        {/* Dashboard */}
        <DhandhaDashboard 
          merchantId={merchantProfile.id}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
};

export default Dhandha;
