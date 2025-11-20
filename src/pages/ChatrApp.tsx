import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Phone, Users, User as UserIcon, MapPin } from 'lucide-react';
import { ChatsList } from '@/components/chatr/ChatsList';
import { ContactsList } from '@/components/chatr/ContactsList';
import { CallsList } from '@/components/chatr/CallsList';
import { SettingsPanel } from '@/components/chatr/SettingsPanel';
import { LocalServices } from '@/components/chatr/LocalServices';

type Tab = 'chats' | 'contacts' | 'calls' | 'local' | 'settings';

export default function ChatrApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/auth');
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(263, 70%, 50%), hsl(263, 70%, 60%))' }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'chats' && <ChatsList userId={user.id} />}
        {activeTab === 'contacts' && <ContactsList userId={user.id} />}
        {activeTab === 'calls' && <CallsList userId={user.id} />}
        {activeTab === 'local' && <LocalServices />}
        {activeTab === 'settings' && <SettingsPanel user={user} />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border/10 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {[
            { id: 'chats', icon: MessageCircle, label: 'Chats' },
            { id: 'contacts', icon: Users, label: 'Contacts' },
            { id: 'calls', icon: Phone, label: 'Calls' },
            { id: 'local', icon: MapPin, label: 'Local' },
            { id: 'settings', icon: UserIcon, label: 'Profile' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-all py-2 px-3 rounded-lg ${
                  isActive ? 'text-[hsl(263,70%,50%)]' : 'text-gray-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
