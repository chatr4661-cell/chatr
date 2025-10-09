import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ContactManager } from '@/components/ContactManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Contacts() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  const handleContactSelect = (contact: any) => {
    // Navigate to chat with selected contact
    navigate('/chat', { state: { selectedContact: contact } });
  };

  if (!userId) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground">Find friends on Chatr</p>
        </div>
      </div>

      {/* Contact Manager */}
      <div className="flex-1 overflow-hidden">
        <ContactManager 
          userId={userId} 
          onContactSelect={handleContactSelect}
        />
      </div>
    </div>
  );
}
