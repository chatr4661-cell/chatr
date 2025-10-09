import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Megaphone, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAnnouncements();
    
    // Subscribe to new announcements
    const channel = supabase
      .channel('announcements')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
        filter: 'is_active=eq.true'
      }, (payload) => {
        setAnnouncements(prev => [payload.new as Announcement, ...prev]);
        toast({
          title: 'New Announcement! 📢',
          description: (payload.new as Announcement).title,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnnouncements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get active announcements
    const { data: activeAnnouncements } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (activeAnnouncements) {
      // Get user's read announcements
      const { data: readAnnouncements } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      const readIds = readAnnouncements?.map(r => r.announcement_id) || [];
      
      // Filter out read announcements
      const unreadAnnouncements = activeAnnouncements.filter(
        a => !readIds.includes(a.id)
      );

      setAnnouncements(unreadAnnouncements);
    }
  };

  const dismissAnnouncement = async (announcementId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mark as read
    await supabase
      .from('announcement_reads')
      .insert({
        user_id: user.id,
        announcement_id: announcementId
      });

    setDismissedIds(prev => [...prev, announcementId]);
    setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {visibleAnnouncements.map((announcement) => (
        <Alert key={announcement.id} className="relative bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <Megaphone className="h-4 w-4 text-primary" />
          <AlertTitle className="pr-8">{announcement.title}</AlertTitle>
          <AlertDescription className="text-xs">
            {announcement.message}
          </AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => dismissAnnouncement(announcement.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Alert>
      ))}
    </div>
  );
}
