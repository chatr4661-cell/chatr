/**
 * Device Transfer Sheet
 * 
 * Bottom sheet showing available devices for call handoff.
 * Triggered from the call screen's "more" menu.
 */

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Smartphone, Monitor, Tablet, Loader2, PhoneForwarded } from 'lucide-react';

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  is_online: boolean;
  last_active: string;
  active_call_id: string | null;
}

interface DeviceTransferSheetProps {
  open: boolean;
  onClose: () => void;
  devices: Device[];
  isTransferring: boolean;
  onTransfer: (deviceId: string) => void;
  onLoadDevices: () => void;
}

const DEVICE_ICONS: Record<string, typeof Smartphone> = {
  android: Smartphone,
  ios: Smartphone,
  web: Monitor,
  desktop: Monitor,
  tablet: Tablet,
};

export default function DeviceTransferSheet({
  open,
  onClose,
  devices,
  isTransferring,
  onTransfer,
  onLoadDevices,
}: DeviceTransferSheetProps) {
  useEffect(() => {
    if (open) onLoadDevices();
  }, [open, onLoadDevices]);

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <PhoneForwarded className="w-5 h-5 text-primary" />
            Transfer Call
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
          {devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No other active devices found</p>
              <p className="text-xs mt-1">Sign in on another device to enable call transfer</p>
            </div>
          ) : (
            devices.map(device => {
              const Icon = DEVICE_ICONS[device.device_type] || Monitor;
              return (
                <button
                  key={device.id}
                  onClick={() => onTransfer(device.id)}
                  disabled={isTransferring}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {device.device_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {device.is_online ? '🟢 Online' : `Last seen ${getTimeSince(device.last_active)}`}
                    </p>
                  </div>
                  {isTransferring ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <PhoneForwarded className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 pb-2">
          <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
