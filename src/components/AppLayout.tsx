import React from 'react';
import { useLocation } from 'react-router-dom';
import { NetworkStatus } from './NetworkStatus';
import { InstallPWAPrompt } from './InstallPWAPrompt';
import { BottomNav } from './BottomNav';
import { Toaster } from './ui/toaster';
import { Toaster as Sonner } from './ui/sonner';

const ProductionCallNotifications = React.lazy(() => 
  import('./calling/ProductionCallNotifications').then(module => ({ 
    default: module.ProductionCallNotifications 
  }))
);

interface AppLayoutProps {
  children: React.ReactNode;
  user: any;
  profile: any;
}

export const AppLayout = ({ children, user, profile }: AppLayoutProps) => {
  const location = useLocation();
  const isIndexPage = location.pathname === '/';
  
  return (
    <>
      <NetworkStatus />
      <InstallPWAPrompt />
      
      {/* Don't load call notifications on index page for faster load */}
      {!isIndexPage && user && profile && (
        <React.Suspense fallback={null}>
          <ProductionCallNotifications 
            userId={user.id} 
            username={profile.username || user.email || 'User'} 
          />
        </React.Suspense>
      )}
      
      {children}
      
      <BottomNav />
      
      <Toaster />
      <Sonner />
    </>
  );
};
