import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Phone, Users, Settings as SettingsIcon, MapPin } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-glow to-primary">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary-glow to-primary text-white p-4 pb-6 rounded-b-3xl shadow-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">CHATR</h1>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-lg font-semibold">
              {user?.user_metadata?.username?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'chats' && <ChatsList userId={user.id} />}
        {activeTab === 'contacts' && <ContactsList userId={user.id} />}
        {activeTab === 'calls' && <CallsList userId={user.id} />}
        {activeTab === 'local' && <LocalServices />}
        {activeTab === 'settings' && <SettingsPanel user={user} />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg">
        <div className="flex items-center justify-around h-20 max-w-md mx-auto">
          {[
            { id: 'chats', icon: MessageCircle, label: 'Chats' },
            { id: 'contacts', icon: Users, label: 'Contacts' },
            { id: 'calls', icon: Phone, label: 'Calls' },
            { id: 'local', icon: MapPin, label: 'Local' },
            { id: 'settings', icon: SettingsIcon, label: 'Profile' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
