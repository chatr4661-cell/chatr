import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Users, Heart, Bell } from 'lucide-react';
import { ConversationList } from '@/components/chat/ConversationList';
import { toast } from 'sonner';

export default function SmartInbox() {
  const [userId, setUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);


  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <h1 className="text-2xl font-bold mb-4">Smart Inbox</h1>
        <p className="text-sm text-muted-foreground">AI-organized conversations</p>
      </div>

      <div className="p-4">
        <p className="text-sm text-muted-foreground text-center">
          Smart Inbox groups your conversations automatically. Use the regular Chats tab for full conversation list.
        </p>
      </div>
    </div>
  );
}
