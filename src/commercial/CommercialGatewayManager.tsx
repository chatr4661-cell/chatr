import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { FirstLaunchCommercial } from './FirstLaunchCommercial';
import { CommercialHubModal } from './CommercialHubModal';
import { isCommercialGatewayEnabled } from './campaignRegistry';

export const CommercialGatewayManager: React.FC = () => {
  const [hubOpen, setHubOpen] = useState(false);
  const location = useLocation();

  if (!isCommercialGatewayEnabled()) {
    return null;
  }

  // Critical workflow protection: NEVER show commercial triggers in active calls, chat conversations, or auth
  const isCriticalWorkflow = 
    location.pathname.startsWith('/chat') ||
    location.pathname.startsWith('/calls') ||
    location.pathname.startsWith('/call/') ||
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/qr-login') ||
    location.pathname.startsWith('/admin');

  if (isCriticalWorkflow) {
    return null;
  }

  return (
    <>
      {/* 1. First-launch commercial sequence (controlled by frequency policy) */}
      <FirstLaunchCommercial onOpenGatewayHub={() => setHubOpen(true)} />

      {/* 2. Persistent Floating Gateway Trigger Button (bottom-left) */}
      <div className="fixed bottom-5 left-5 z-40 hidden sm:block">
        <button
          type="button"
          onClick={() => setHubOpen(true)}
          title="Explore CHATR Ecosystem & Partner Services"
          aria-label="Explore CHATR Ecosystem & Partner Services"
          className="group flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800 shadow-md hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <span className="p-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="font-medium">Commercial Gateway</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-500">
            7
          </span>
        </button>
      </div>

      {/* 3. Persistent Commercial Hub Modal */}
      <CommercialHubModal isOpen={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
};
