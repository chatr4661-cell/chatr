import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Monitor, Smartphone, Tablet, Trash2, Loader2, QrCode, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LinkedDevice {
  id: string;
  device_name: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  last_active_at: string;
  created_at: string;
  is_active: boolean;
}

const LinkedDevices = () => {
  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchDevices(user.id);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchDevices = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('linked_devices')
        .select('*')
        .eq('user_id', uid)
        .eq('is_active', true)
        .order('last_active_at', { ascending: false });

      if (error) throw error;
      setDevices((data as LinkedDevice[]) || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load linked devices');
    } finally {
      setLoading(false);
    }
  };

  const revokeDevice = async (deviceId: string) => {
    if (!userId) return;
    setRevoking(deviceId);
    try {
      const { error } = await supabase
        .from('linked_devices')
        .update({ is_active: false })
        .eq('id', deviceId)
        .eq('user_id', userId);

      if (error) throw error;

      setDevices(prev => prev.filter(d => d.id !== deviceId));
      toast.success('Device logged out successfully');
    } catch (error) {
      console.error('Error revoking device:', error);
      toast.error('Failed to log out device');
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Linked Devices
        </CardTitle>
        <CardDescription>
          Manage devices where you're logged into CHATR Web
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {devices.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No linked devices</p>
            <p className="text-xs mt-1">Visit chatr.chat/web to link a device</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getDeviceIcon(device.device_type)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{device.device_name || 'Web Browser'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{device.browser}</span>
                      <span>•</span>
                      <span>{device.os}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>Last active: {format(new Date(device.last_active_at), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeDevice(device.id)}
                  disabled={revoking === device.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {revoking === device.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> To link a new device, open chatr.chat/web on your computer and scan the QR code with your phone.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LinkedDevices;