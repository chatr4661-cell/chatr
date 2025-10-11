import React from 'react';
import { NetworkStatus } from './NetworkStatus';
import { InstallPWAPrompt } from './InstallPWAPrompt';
import { ProductionCallNotifications } from './calling/ProductionCallNotifications';
import { BottomNav } from './BottomNav';
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
        <ProductionCallNotifications 
          userId={user.id} 
          username={profile.username || user.email || 'User'} 
        />
      )}
      
      {children}
      
      <BottomNav />
      
      <Toaster />
      <Sonner />
    </>
  );
};
