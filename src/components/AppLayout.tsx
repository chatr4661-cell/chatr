import React from 'react';
import { NetworkStatus } from './NetworkStatus';
import { InstallPWAPrompt } from './InstallPWAPrompt';
import { GlobalCallNotifications } from './GlobalCallNotifications';
import { Toaster } from './ui/toaster';
import { Toaster as Sonner } from './ui/sonner';

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
      
      {user && profile && (
        <GlobalCallNotifications 
          userId={user.id} 
          username={profile.username || 'User'} 
        />
      )}
      
      {children}
      
      <Toaster />
      <Sonner />
    </>
  );
};
