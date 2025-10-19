import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ContactManager } from '@/components/ContactManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Contacts() {
  const navigate = useNavigate();
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
    // Navigate to chat with selected contact
    navigate('/chat', { state: { selectedContact: contact } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Native Header */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center gap-2 p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-9 w-9 rounded-full hover:bg-muted/50 active:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Contacts</h1>
          </div>
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
