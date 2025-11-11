import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, Users, Shield, Settings } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-3">
          <MapPin className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-[#2E1065]">Live Location Sharing</h2>
        <p className="text-sm text-muted-foreground">Share your real-time location with friends & family</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Duration Card */}
        <Card className="p-6 space-y-4 border-2 hover:border-purple-200 transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-[#9333EA]" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E1065]">Duration</h3>
              <p className="text-xs text-muted-foreground">Choose how long to share</p>
            </div>
          </div>
          
          <Select value={duration} onValueChange={(v: any) => setDuration(v)}>
            <SelectTrigger className="h-12 border-2 hover:border-purple-200 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15min">⏱️ 15 minutes</SelectItem>
              <SelectItem value="1hr">⏰ 1 hour</SelectItem>
              <SelectItem value="continuous">♾️ Continuous</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {/* Share With Card */}
        <Card className="p-6 space-y-4 border-2 hover:border-purple-200 transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-[#9333EA]" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E1065]">Share With</h3>
              <p className="text-xs text-muted-foreground">{sharedWith.length} selected</p>
            </div>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No contacts available</p>
            ) : (
              contacts.map((contact: any) => (
                <div
                  key={contact.contact_user_id}
                  onClick={() => toggleContact(contact.contact_user_id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                    sharedWith.includes(contact.contact_user_id)
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-[#9333EA] shadow-sm'
                      : 'bg-white border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {contact.avatar_url && (
                      <img
                        src={contact.avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full ring-2 ring-purple-100"
                      />
                    )}
                    <span className="text-sm font-medium text-[#2E1065]">
                      {contact.display_name}
                    </span>
                    {sharedWith.includes(contact.contact_user_id) && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-[#9333EA] flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Permissions Info Card */}
      {!isSharing && (
        <Card className="p-5 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border-2 border-purple-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-[#9333EA]" />
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="font-semibold text-[#2E1065] text-sm">Privacy & Permissions</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your location is encrypted and only visible to selected contacts. You can stop sharing anytime.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Button */}
      {!isSharing ? (
        <Button 
          onClick={startSharing} 
          disabled={sharedWith.length === 0}
          className="w-full h-14 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-400"
        >
          <MapPin className="h-5 w-5 mr-2" />
          Start Sharing Location
        </Button>
      ) : (
        <Card className="p-6 space-y-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold text-green-900">
              Sharing with {sharedWith.length} contact{sharedWith.length !== 1 ? 's' : ''}
            </span>
          </div>

          {shareEndTime && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Clock className="h-4 w-4" />
              <span>Expires at {shareEndTime.toLocaleTimeString()}</span>
            </div>
          )}

          {location && (
            <div className="text-xs text-green-700 space-y-1 bg-white/50 p-3 rounded-lg">
              <div className="font-mono">📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</div>
              <div>Accuracy: ±{Math.round(location.accuracy)}m</div>
            </div>
          )}

          <Button 
            onClick={stopSharing} 
            variant="destructive" 
            className="w-full h-12 font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Stop Sharing
          </Button>
        </Card>
      )}
    </div>
  );
};
