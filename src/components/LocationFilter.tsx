import { useState, useEffect } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocationStatus } from '@/hooks/useLocationStatus';
import { supabase } from '@/integrations/supabase/client';

interface LocationFilterProps {
  onLocationChange: (location: { city: string; pincode: string; latitude?: number; longitude?: number }) => void;
}

export const LocationFilter = ({ onLocationChange }: LocationFilterProps) => {
  const [userId, setUserId] = useState<string>();
  const { status } = useLocationStatus(userId);
  const [manualPincode, setManualPincode] = useState('');
  const [useGPS, setUseGPS] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (useGPS && status.city) {
      onLocationChange({
        city: status.city,
        pincode: '',
        latitude: status.latitude,
        longitude: status.longitude
      });
    }
  }, [status, useGPS, onLocationChange]);

  const handlePincodeSubmit = () => {
    if (manualPincode.length === 6) {
      setUseGPS(false);
      onLocationChange({
        city: '',
        pincode: manualPincode,
        latitude: undefined,
        longitude: undefined
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-6">
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">
          {useGPS && status.city ? (
            <>Showing results near <strong>{status.city}</strong></>
          ) : manualPincode ? (
            <>Showing results for <strong>{manualPincode}</strong></>
          ) : (
            'Set your location'
          )}
        </span>
      </div>

      <div className="flex gap-2 flex-1 max-w-sm">
        <Input
          type="text"
          placeholder="Enter pincode"
          value={manualPincode}
          onChange={(e) => setManualPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          className="flex-1"
        />
        <Button onClick={handlePincodeSubmit} size="sm" variant="outline">
          Apply
        </Button>
        {status.latitude && (
          <Button
            onClick={() => {
              setUseGPS(true);
              setManualPincode('');
            }}
            size="sm"
            variant="ghost"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
