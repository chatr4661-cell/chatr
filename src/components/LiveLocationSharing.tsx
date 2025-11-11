import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBackgroundLocation } from '@/hooks/useBackgroundLocation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LiveLocationSharingProps {
  userId: string;
}

export const LiveLocationSharing = ({ userId }: LiveLocationSharingProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [duration, setDuration] = useState<'15min' | '1hr' | 'continuous'>('15min');
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [shareEndTime, setShareEndTime] = useState<Date | null>(null);
  
  const { location, isTracking, startTracking, stopTracking } = useBackgroundLocation(userId);

  // Load contacts
  useEffect(() => {
    const loadContacts = async () => {
      const { data } = await supabase
        .from('user_contacts')
        .select('contact_user_id, display_name')
        .eq('user_id', userId) as any;
      
      if (data) {
        setContacts(data);
      }
    };

    loadContacts();
  }, [userId]);

  // Load active sharing status
  useEffect(() => {
    const loadSharingStatus = async () => {
      const { data } = await supabase
        .from('location_shares')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single() as any;

      if (data) {
        setIsSharing(true);
        setSharedWith((data as any).shared_with || []);
        setShareEndTime((data as any).expires_at ? new Date((data as any).expires_at) : null);
      }
    };

    loadSharingStatus();
  }, [userId]);

  const startSharing = async () => {
    if (sharedWith.length === 0) {
      toast.error('Select at least one contact to share with');
      return;
    }

    let expiresAt: string | null = null;
    
    if (duration === '15min') {
      expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    } else if (duration === '1hr') {
      expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }

    const { error } = await supabase
      .from('location_shares')
      .insert({
        user_id: userId,
        shared_with: sharedWith,
        duration: duration,
        expires_at: expiresAt,
        is_active: true,
      } as any);

    if (error) {
      toast.error('Failed to start location sharing');
      return;
    }

    setIsSharing(true);
    setShareEndTime(expiresAt ? new Date(expiresAt) : null);
    await startTracking();
    
    toast.success(`Sharing location for ${duration === '15min' ? '15 minutes' : duration === '1hr' ? '1 hour' : 'continuous'}`);
  };

  const stopSharing = async () => {
    await (supabase as any)
      .from('location_shares')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    setIsSharing(false);
    setShareEndTime(null);
    await stopTracking();
    
    toast.success('Location sharing stopped');
  };

  const toggleContact = (contactId: string) => {
    setSharedWith(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Live Location Sharing</h3>
      </div>

      {!isSharing ? (
        <>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Duration</label>
              <Select value={duration} onValueChange={(v: any) => setDuration(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15min">15 minutes</SelectItem>
                  <SelectItem value="1hr">1 hour</SelectItem>
                  <SelectItem value="continuous">Continuous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                <Users className="h-4 w-4" />
                Share with contacts
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contacts.map((contact: any) => (
                  <div
                    key={contact.contact_user_id}
                    onClick={() => toggleContact(contact.contact_user_id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      sharedWith.includes(contact.contact_user_id)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {contact.avatar_url && (
                        <img
                          src={contact.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      )}
                      <span className="text-sm font-medium">
                        {contact.display_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={startSharing} className="w-full" disabled={sharedWith.length === 0}>
            <MapPin className="h-4 w-4 mr-2" />
            Start Sharing Location
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium">Sharing location with {sharedWith.length} contact(s)</span>
          </div>

          {shareEndTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Expires at {shareEndTime.toLocaleTimeString()}</span>
            </div>
          )}

          {location && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Lat: {location.latitude.toFixed(6)}</div>
              <div>Lng: {location.longitude.toFixed(6)}</div>
              <div>Accuracy: ±{Math.round(location.accuracy)}m</div>
            </div>
          )}

          <Button onClick={stopSharing} variant="destructive" className="w-full">
            Stop Sharing
          </Button>
        </div>
      )}
    </Card>
  );
};
