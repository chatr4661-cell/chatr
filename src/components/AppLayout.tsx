import type { ReactNode } from 'react';
import { NetworkStatus } from './NetworkStatus';
import { InstallPWAPrompt } from './InstallPWAPrompt';
import { GlobalCallNotifications } from './GlobalCallNotifications';
import { BottomNav } from './BottomNav';
import { Toaster } from './ui/toaster';
import { Toaster as Sonner } from './ui/sonner';

interface AppLayoutProps {
  children: ReactNode;
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
      
      <BottomNav />
      
      <Toaster />
      <Sonner />
    </>
  );
};
