import { SEOHead } from '@/components/SEOHead';
import { StealthModeSettings } from '@/components/stealth-mode/StealthModeSettings';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function StealthMode() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead 
        title="Stealth Mode - Chatr"
        description="Choose your Chatr experience: Default, Seller, or Rewards mode"
      />
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="p-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Stealth Mode</h1>
          </div>
        </div>
        
        <div className="p-4 max-w-2xl mx-auto">
          <StealthModeSettings />
        </div>
      </div>
    </>
  );
}
