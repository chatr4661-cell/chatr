import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Settings, Receipt, Users, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MerchantSetup } from '@/components/dhandha/MerchantSetup';
import { VoiceBillingCard } from '@/components/dhandha/VoiceBillingCard';
import { DhandhaDashboard } from '@/components/dhandha/DhandhaDashboard';
import { CustomerLedger } from '@/components/dhandha/CustomerLedger';
import { BillHistory } from '@/components/dhandha/BillHistory';

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
  const [tab, setTab] = useState('bill');

  useEffect(() => { checkMerchantProfile(); }, []);

  const checkMerchantProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      const { data, error } = await supabase
        .from('merchant_profiles')
        .select('id, upi_id, business_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data) setMerchantProfile(data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!merchantProfile) return <MerchantSetup onComplete={checkMerchantProfile} />;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-bold text-sm truncate">{merchantProfile.business_name || 'My Dhandha'}</h1>
              <p className="text-[11px] text-muted-foreground truncate">{merchantProfile.upi_id}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 max-w-lg mx-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="bill" className="gap-1.5"><Receipt className="w-3.5 h-3.5" />Bill</TabsTrigger>
            <TabsTrigger value="khaata" className="gap-1.5"><Users className="w-3.5 h-3.5" />Khaata</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><History className="w-3.5 h-3.5" />History</TabsTrigger>
          </TabsList>

          <TabsContent value="bill" className="space-y-4">
            <VoiceBillingCard
              merchantProfile={merchantProfile}
              onTransactionCreated={() => setRefreshTrigger(p => p + 1)}
            />
            <DhandhaDashboard merchantId={merchantProfile.id} refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="khaata">
            <CustomerLedger
              merchantId={merchantProfile.id}
              upiId={merchantProfile.upi_id}
              businessName={merchantProfile.business_name || 'Shop'}
            />
          </TabsContent>

          <TabsContent value="history">
            <BillHistory merchantId={merchantProfile.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dhandha;

