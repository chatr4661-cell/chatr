import { useState } from 'react';
import { useStealthMode, StealthModeType } from '@/hooks/useStealthMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { User, Store, Coins, Check, Shield, Zap, TrendingUp } from 'lucide-react';
import { SellerModePanel } from './SellerModePanel';
import { RewardsModePanel } from './RewardsModePanel';

export const StealthModeSettings = () => {
  const { mode, loading, switchMode, verifyForSeller, optIntoRewards } = useStealthMode();
  const [switching, setSwitching] = useState(false);

  const handleModeSwitch = async (newMode: StealthModeType) => {
    if (mode?.current_mode === newMode) return;
    
    setSwitching(true);
    const { error } = await switchMode(newMode);
    setSwitching(false);

    if (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to switch mode');
    } else {
      toast.success(`Switched to ${newMode} mode`);
    }
  };

  const handleVerify = async () => {
    const { error } = await verifyForSeller();
    if (error) {
      toast.error('Verification failed');
    } else {
      toast.success('Account verified for seller mode');
    }
  };

  const handleOptInRewards = async () => {
    const { error } = await optIntoRewards();
    if (error) {
      toast.error('Failed to opt into rewards');
    } else {
      toast.success('Opted into rewards program');
    }
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  const modes = [
    {
      id: 'default' as StealthModeType,
      title: 'Default Mode',
      description: 'Standard user experience',
      icon: User,
      features: ['Basic chat', 'Standard privacy', 'Normal visibility'],
      free: true
    },
    {
      id: 'seller' as StealthModeType,
      title: 'Seller Mode',
      description: 'For businesses & sellers',
      icon: Store,
      features: ['Business profile', 'Quick replies', 'Broadcast messages', 'Analytics'],
      free: false,
      requiresVerification: true
    },
    {
      id: 'rewards' as StealthModeType,
      title: 'Rewards Mode',
      description: 'Earn coins & rewards',
      icon: Coins,
      features: ['Coin multipliers', 'Daily challenges', 'Ad rewards', 'Streak bonuses'],
      free: true,
      optIn: true
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Stealth Mode
          </CardTitle>
          <CardDescription>
            Choose how you want to use Chatr
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {modes.map((m) => (
              <Card 
                key={m.id}
                className={`cursor-pointer transition-all ${
                  mode?.current_mode === m.id 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => {
                  if (m.id === 'seller' && !mode?.seller_verified) {
                    toast.info('Please verify your account first');
                    return;
                  }
                  if (m.id === 'rewards' && !mode?.rewards_opted_in) {
                    handleOptInRewards();
                    return;
                  }
                  handleModeSwitch(m.id);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <m.icon className="h-8 w-8 text-primary" />
                    {mode?.current_mode === m.id && (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" /> Active
                      </Badge>
                    )}
                    {!m.free && (
                      <Badge variant="secondary">
                        <Zap className="h-3 w-3 mr-1" /> Pro
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{m.title}</CardTitle>
                  <CardDescription className="text-xs">{m.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    {m.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-3 w-3 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  
                  {m.id === 'seller' && !mode?.seller_verified && (
                    <Button 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerify();
                      }}
                    >
                      Verify Account
                    </Button>
                  )}
                  
                  {m.id === 'rewards' && !mode?.rewards_opted_in && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOptInRewards();
                      }}
                    >
                      Opt In
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {mode?.current_mode === 'seller' && <SellerModePanel />}
      {mode?.current_mode === 'rewards' && <RewardsModePanel />}
    </div>
  );
};
