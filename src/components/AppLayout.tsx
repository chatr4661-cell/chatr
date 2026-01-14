import React from 'react';
import { NetworkStatus } from './NetworkStatus';
import { InstallPWAPrompt } from './InstallPWAPrompt';
import { Toaster } from './ui/toaster';
import { Toaster as Sonner } from './ui/sonner';

// NOTE: Call notifications are handled by GlobalCallListener in App.tsx
// Do NOT add ProductionCallNotifications here - it creates duplicate listeners

interface AppLayoutProps {
  children: React.ReactNode;
  user: any;
  profile: any;
}

export const AppLayout = ({ children, user, profile }: AppLayoutProps) => {
  return (
    <>
      <NetworkStatus />
      <InstallPWAPrompt />
      {children}
      <Toaster />
      <Sonner />
    </>
  );
};
