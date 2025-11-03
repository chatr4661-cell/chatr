import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MapPin, Shield, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationPrivacySettingsProps {
  userId: string;
}

export const LocationPrivacySettings = ({ userId }: LocationPrivacySettingsProps) => {
  const { toast } = useToast();
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [precision, setPrecision] = useState<'exact' | 'city' | 'off'>('city');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('location_sharing_enabled, location_precision')
        .eq('id', userId)
        .single();

      if (data) {
        setLocationEnabled(data.location_sharing_enabled ?? true);
        setPrecision((data.location_precision as 'exact' | 'city' | 'off') || 'city');
      }
    };

    loadSettings();
  }, [userId]);

  const handleToggleLocation = async (enabled: boolean) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ location_sharing_enabled: enabled })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update location settings',
        variant: 'destructive'
      });
    } else {
      setLocationEnabled(enabled);
      toast({
        title: 'Settings updated',
        description: enabled ? 'Location sharing enabled' : 'Location sharing disabled'
      });
    }
    setIsLoading(false);
  };

  const handlePrecisionChange = async (value: string) => {
    setIsLoading(true);
    const newPrecision = value as 'exact' | 'city' | 'off';
    
    const { error } = await supabase
      .from('profiles')
      .update({ location_precision: newPrecision })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update precision settings',
        variant: 'destructive'
      });
    } else {
      setPrecision(newPrecision);
      toast({
        title: 'Precision updated',
        description: `Location precision set to: ${newPrecision}`
      });
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle>Location & Presence</CardTitle>
        </div>
        <CardDescription>
          Control how your location and online status are shared with others
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location Sharing Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="location-sharing" className="text-base">
              Share my location
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow contacts to see your approximate location
            </p>
          </div>
          <Switch
            id="location-sharing"
            checked={locationEnabled}
            onCheckedChange={handleToggleLocation}
            disabled={isLoading}
          />
        </div>

        {/* Location Precision */}
        {locationEnabled && (
          <div className="space-y-3">
            <Label className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Location Precision
            </Label>
            <RadioGroup value={precision} onValueChange={handlePrecisionChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="city" id="city" />
                <Label htmlFor="city" className="font-normal cursor-pointer">
                  <div>
                    <div className="font-medium">City only</div>
                    <div className="text-xs text-muted-foreground">
                      Show your city and country (e.g., "Mumbai, India")
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="exact" id="exact" />
                <Label htmlFor="exact" className="font-normal cursor-pointer">
                  <div>
                    <div className="font-medium">Precise location</div>
                    <div className="text-xs text-muted-foreground">
                      Share exact GPS coordinates during calls
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="off" id="off" />
                <Label htmlFor="off" className="font-normal cursor-pointer">
                  <div>
                    <div className="font-medium">Hide location</div>
                    <div className="text-xs text-muted-foreground">
                      Only show "last seen" status
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Privacy & Compliance</p>
              <ul className="space-y-1 text-xs">
                <li>• Location updates every 5 minutes when app is active</li>
                <li>• GPS requires permission on your device</li>
                <li>• IP-based location used as fallback</li>
                <li>• Data is encrypted and stored securely</li>
                <li>• You can disable location sharing anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};