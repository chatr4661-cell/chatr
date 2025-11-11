import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Bell, Users, MapPin, CheckCircle2, AlertCircle, Loader2, Phone, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Contacts } from '@capacitor-community/contacts';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface UnifiedPermissionsSetupProps {
  userId: string;
  onComplete?: () => void;
}

interface PermissionStatus {
  notifications: 'pending' | 'granted' | 'denied' | 'checking';
  contacts: 'pending' | 'granted' | 'denied' | 'checking';
  location: 'pending' | 'granted' | 'denied' | 'checking';
}

export const UnifiedPermissionsSetup = ({ userId, onComplete }: UnifiedPermissionsSetupProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    notifications: 'pending',
    contacts: 'pending',
    location: 'pending'
  });

  const isNative = Capacitor.isNativePlatform();

  // Check if permissions are already granted
  useEffect(() => {
    checkExistingPermissions();
  }, []);

  const checkExistingPermissions = async () => {
    try {
      const status: PermissionStatus = {
        notifications: 'pending',
        contacts: 'pending',
        location: 'pending'
      };

      // Check notifications
      if (isNative) {
        const notifPerm = await PushNotifications.checkPermissions();
        status.notifications = notifPerm.receive === 'granted' ? 'granted' : 'pending';
      } else if ('Notification' in window) {
        status.notifications = Notification.permission === 'granted' ? 'granted' : 'pending';
      }

      // Check contacts (native only)
      if (isNative) {
        const contactPerm = await Contacts.checkPermissions();
        status.contacts = contactPerm.contacts === 'granted' ? 'granted' : 'pending';
      }

      // Check location
      if (isNative) {
        const locPerm = await Geolocation.checkPermissions();
        status.location = locPerm.location === 'granted' ? 'granted' : 'pending';
      } else if ('geolocation' in navigator) {
        // Can't check without requesting in web
        status.location = 'pending';
      }

      setPermissionStatus(status);

      // Check if we should auto-show dialog
      const hasShownSetup = localStorage.getItem(`permissions_setup_shown_${userId}`);
      const allGranted = Object.values(status).every(s => s === 'granted');
      
      if (!hasShownSetup && !allGranted) {
        setTimeout(() => setShowDialog(true), 2000);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const enableAllPermissions = async () => {
    setIsEnabling(true);
    setProgress(0);

    try {
      // Step 1: Push Notifications
      setCurrentStep(1);
      setPermissionStatus(prev => ({ ...prev, notifications: 'checking' }));
      await enablePushNotifications();
      setProgress(33);

      // Step 2: Contacts
      setCurrentStep(2);
      setPermissionStatus(prev => ({ ...prev, contacts: 'checking' }));
      await enableContactsSync();
      setProgress(66);

      // Step 3: Location
      setCurrentStep(3);
      setPermissionStatus(prev => ({ ...prev, location: 'checking' }));
      await enableLocationSharing();
      setProgress(100);

      // Mark as complete
      localStorage.setItem(`permissions_setup_shown_${userId}`, 'true');
      
      toast.success('🎉 All features enabled!', {
        description: 'You\'re all set to use Chatr+'
      });

      setTimeout(() => {
        setShowDialog(false);
        onComplete?.();
      }, 1500);

    } catch (error) {
      console.error('Permission setup error:', error);
      toast.error('Some permissions were not granted', {
        description: 'You can enable them later in settings'
      });
    } finally {
      setIsEnabling(false);
      setCurrentStep(0);
    }
  };

  const enablePushNotifications = async () => {
    try {
      if (isNative) {
        const permission = await PushNotifications.requestPermissions();
        
        if (permission.receive === 'granted') {
          await PushNotifications.register();
          
          // Listen for registration
          const listener = await PushNotifications.addListener('registration', async (token) => {
            // Save token to Supabase
            await supabase.from('device_tokens').upsert({
              user_id: userId,
              device_token: token.value,
              platform: Capacitor.getPlatform(),
              last_used_at: new Date().toISOString()
            });
            
            setPermissionStatus(prev => ({ ...prev, notifications: 'granted' }));
            PushNotifications.removeAllListeners();
          });
        } else {
          setPermissionStatus(prev => ({ ...prev, notifications: 'denied' }));
        }
      } else {
        // Web push notifications
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          setPermissionStatus(prev => ({ 
            ...prev, 
            notifications: permission === 'granted' ? 'granted' : 'denied' 
          }));
        }
      }
    } catch (error) {
      console.error('Push notification error:', error);
      setPermissionStatus(prev => ({ ...prev, notifications: 'denied' }));
    }
  };

  const enableContactsSync = async () => {
    try {
      if (!isNative) {
        setPermissionStatus(prev => ({ ...prev, contacts: 'granted' }));
        return;
      }

      const permission = await Contacts.requestPermissions();
      
      if (permission.contacts === 'granted') {
        // Sync contacts
        const result = await Contacts.getContacts({
          projection: {
            name: true,
            phones: true,
            emails: true,
          }
        });

        const contactsData = result.contacts.map(contact => {
          const phone = contact.phones?.[0]?.number || '';
          const email = contact.emails?.[0]?.address || '';
          
          return {
            name: contact.name?.display || 'Unknown',
            phone: phone,
            email: email
          };
        }).filter(c => c.phone || c.email);

        // Sync to database
        await supabase.rpc('sync_user_contacts', {
          user_uuid: userId,
          contact_list: contactsData
        });

        await supabase
          .from('profiles')
          .update({ 
            contacts_synced: true,
            last_contact_sync: new Date().toISOString()
          })
          .eq('id', userId);

        setPermissionStatus(prev => ({ ...prev, contacts: 'granted' }));
      } else {
        setPermissionStatus(prev => ({ ...prev, contacts: 'denied' }));
      }
    } catch (error) {
      console.error('Contacts sync error:', error);
      setPermissionStatus(prev => ({ ...prev, contacts: 'denied' }));
    }
  };

  const enableLocationSharing = async () => {
    try {
      if (isNative) {
        const permission = await Geolocation.requestPermissions();
        
        if (permission.location === 'granted' || permission.location === 'prompt') {
          // Get current location
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true
          });

          // Save to database
          await supabase
            .from('profiles')
            .update({
              location_latitude: position.coords.latitude,
              location_longitude: position.coords.longitude,
              location_sharing_enabled: true,
              location_precision: 'city',
              location_updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          setPermissionStatus(prev => ({ ...prev, location: 'granted' }));
        } else {
          setPermissionStatus(prev => ({ ...prev, location: 'denied' }));
        }
      } else {
        // Web geolocation
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              await supabase
                .from('profiles')
                .update({
                  location_latitude: position.coords.latitude,
                  location_longitude: position.coords.longitude,
                  location_sharing_enabled: true,
                  location_precision: 'city',
                  location_updated_at: new Date().toISOString()
                })
                .eq('id', userId);
              
              setPermissionStatus(prev => ({ ...prev, location: 'granted' }));
            },
            () => {
              setPermissionStatus(prev => ({ ...prev, location: 'denied' }));
            }
          );
        }
      }
    } catch (error) {
      console.error('Location error:', error);
      setPermissionStatus(prev => ({ ...prev, location: 'denied' }));
    }
  };

  const allGranted = Object.values(permissionStatus).every(s => s === 'granted');

  return (
    <>
      {/* Compact trigger button */}
      <Button
        onClick={() => setShowDialog(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Settings className="w-4 h-4" />
        {allGranted ? 'Permissions' : 'Enable Features'}
        {!allGranted && (
          <Badge variant="destructive" className="ml-1">
            {Object.values(permissionStatus).filter(s => s !== 'granted').length}
          </Badge>
        )}
      </Button>

      {/* Setup Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Quick Setup to Stay Connected</DialogTitle>
            <DialogDescription className="text-sm">
              Enable push notifications, contact sync, and live location to unlock all features
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Permission Cards */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    Push Notifications
                    {permissionStatus.notifications === 'granted' && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    {permissionStatus.notifications === 'checking' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Never miss messages and calls
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    Contact Sync
                    {permissionStatus.contacts === 'granted' && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    {permissionStatus.contacts === 'checking' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Find friends already on Chatr
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    Live Location
                    {permissionStatus.location === 'granted' && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    {permissionStatus.location === 'checking' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share location with selected contacts
                  </p>
                </div>
              </div>
            </Card>

            {/* Progress */}
            {isEnabling && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {currentStep === 1 && 'Enabling notifications...'}
                  {currentStep === 2 && 'Syncing contacts...'}
                  {currentStep === 3 && 'Setting up location...'}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {!allGranted ? (
                <>
                  <Button
                    onClick={enableAllPermissions}
                    disabled={isEnabling}
                    className="flex-1 gap-2"
                  >
                    {isEnabling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Enable All
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      localStorage.setItem(`permissions_setup_shown_${userId}`, 'true');
                      setShowDialog(false);
                    }}
                    variant="ghost"
                    disabled={isEnabling}
                  >
                    Maybe Later
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setShowDialog(false)}
                  className="w-full"
                >
                  All Set!
                </Button>
              )}
            </div>

            {/* Privacy note */}
            <p className="text-xs text-center text-muted-foreground">
              🔒 Your privacy is protected. You control what you share.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
