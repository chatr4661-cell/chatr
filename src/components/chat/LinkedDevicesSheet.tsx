/**
 * Linked Devices Sheet
 * Manage devices connected to your account
 */

import React, { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useMultiDeviceSync } from '@/hooks/useMultiDeviceSync';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Smartphone, 
  Laptop, 
  Monitor,
  Tablet,
  Trash2,
  Shield,
  Check,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LinkedDevicesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LinkedDevicesSheet: React.FC<LinkedDevicesSheetProps> = ({
  open,
  onOpenChange
}) => {
  const {
    devices,
    currentDeviceId,
    loading,
    loadDevices,
    unlinkDevice,
    unlinkAllOtherDevices
  } = useMultiDeviceSync();

  useEffect(() => {
    if (open) {
      loadDevices();
    }
  }, [open, loadDevices]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'android':
      case 'ios':
        return Smartphone;
      case 'desktop':
        return Monitor;
      case 'web':
      default:
        return Laptop;
    }
  };

  const getDeviceColor = (deviceType: string) => {
    switch (deviceType) {
      case 'android':
        return 'text-green-500';
      case 'ios':
        return 'text-blue-500';
      case 'desktop':
        return 'text-purple-500';
      default:
        return 'text-primary';
    }
  };

  const isRecentlyActive = (lastActive: string) => {
    const diff = Date.now() - new Date(lastActive).getTime();
    return diff < 5 * 60 * 1000; // 5 minutes
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Linked Devices
          </SheetTitle>
          <SheetDescription>
            Manage devices connected to your CHATR account
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(80vh-140px)] pb-6">
          {/* Security Notice */}
          <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-xl">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">End-to-end encrypted</p>
              <p className="text-xs text-muted-foreground">
                All your messages stay private across all devices
              </p>
            </div>
          </div>

          {/* Current Device */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">THIS DEVICE</h3>
            {devices.filter(d => d.is_current).map(device => {
              const DeviceIcon = getDeviceIcon(device.device_type);
              return (
                <div 
                  key={device.id}
                  className="flex items-center gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20"
                >
                  <div className={cn("p-2 rounded-full bg-green-500/20", getDeviceColor(device.device_type))}>
                    <DeviceIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{device.device_name}</p>
                      <div className="flex items-center gap-1 text-xs text-green-500">
                        <Check className="w-3 h-3" />
                        Active now
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {device.browser} • {device.os}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Other Devices */}
          {devices.filter(d => !d.is_current).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">OTHER DEVICES</h3>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive text-xs">
                      Log out all
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Log out all other devices?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove access from all devices except this one. You'll need to log in again on those devices.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={unlinkAllOtherDevices}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Log out all
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {devices.filter(d => !d.is_current).map(device => {
                const DeviceIcon = getDeviceIcon(device.device_type);
                const isActive = isRecentlyActive(device.last_active);
                
                return (
                  <div 
                    key={device.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                  >
                    <div className={cn("p-2 rounded-full bg-muted", getDeviceColor(device.device_type))}>
                      <DeviceIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{device.device_name}</p>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isActive ? 'Active now' : `Last active ${formatDistanceToNow(new Date(device.last_active), { addSuffix: true })}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => unlinkDevice(device.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* No other devices */}
          {devices.filter(d => !d.is_current).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Laptop className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No other devices linked</p>
              <p className="text-xs">Log in on another device to sync your chats</p>
            </div>
          )}

          {/* Link New Device */}
          <div className="pt-4 border-t space-y-3">
            <h3 className="font-semibold">Link a New Device</h3>
            <p className="text-sm text-muted-foreground">
              To link CHATR Web or Desktop:
            </p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open CHATR on your computer</li>
              <li>Go to Settings → Linked Devices</li>
              <li>Scan the QR code with this phone</li>
            </ol>
            <Button variant="outline" className="w-full mt-3">
              <Smartphone className="w-4 h-4 mr-2" />
              Scan QR Code
            </Button>
          </div>

          {/* Security Warning */}
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Don't recognize a device?</p>
              <p className="text-xs text-muted-foreground">
                If you see a device you don't recognize, remove it immediately and change your password.
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
