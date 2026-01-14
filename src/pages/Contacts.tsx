import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ContactManager } from '@/components/ContactManager';
import { AppleHeader } from '@/components/ui/AppleHeader';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

export default function Contacts() {
  const navigate = useNavigate();
  const haptics = useNativeHaptics();
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUserId(session.user.id);
        setLoading(false);
      }
    });
  }, [navigate]);

  const handleContactSelect = (contact: any) => {
    haptics.light();
    navigate('/chat', { state: { selectedContact: contact } });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background safe-area-pt">
        {/* Apple-style loading */}
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">Loading contacts...</p>
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div className="h-screen flex flex-col bg-background safe-area-pt">
      {/* Apple-style Header */}
      <AppleHeader
        title="Contacts"
        onBack={() => {
          haptics.light();
          navigate(-1);
        }}
        showBack
      />

      {/* Contact Manager with Apple styling */}
      <div className="flex-1 overflow-hidden">
        <ContactManager 
          userId={userId} 
          onContactSelect={handleContactSelect}
        />
      </div>
    </div>
  );
}
