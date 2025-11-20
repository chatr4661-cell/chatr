import React, { useState } from 'react';
import { HomeScreen } from '@/chatr-os/ui/HomeScreen';
import { AppSwitcher } from '@/chatr-os/ui/AppSwitcher';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Grid3x3, LayoutGrid } from 'lucide-react';

/**
 * OS Home Page
 * The main entry point for CHATR OS
 * Shows the app launcher (HomeScreen)
 */
const OSHome = () => {
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const navigate = useNavigate();

  // Global gesture handler for app switcher (swipe up from bottom)
  React.useEffect(() => {
    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const deltaY = startY - endY;
      const deltaTime = Date.now() - startTime;
      
      // Swipe up from bottom edge (within 100px of bottom, swipe up at least 150px, within 500ms)
      if (startY > window.innerHeight - 100 && deltaY > 150 && deltaTime < 500) {
        setShowAppSwitcher(true);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Home Screen (always visible) */}
      <HomeScreen isOpen={true} onClose={() => {}} />

      {/* App Switcher (overlay) */}
      <AppSwitcher 
        isOpen={showAppSwitcher} 
        onClose={() => setShowAppSwitcher(false)} 
      />

      {/* Floating Action Button for App Switcher */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => setShowAppSwitcher(true)}
      >
        <LayoutGrid className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default OSHome;
