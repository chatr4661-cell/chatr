import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Viewer {
  viewer_id: string;
  viewed_at: string;
  profile: {
    username: string;
    avatar_url?: string;
  };
  reaction?: string;
}

interface StoryViewerAnalyticsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
}

export const StoryViewerAnalytics = ({ 
  open, 
  onOpenChange, 
  storyId 
}: StoryViewerAnalyticsProps) => {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [totalReactions, setTotalReactions] = useState(0);

  useEffect(() => {
    if (open && storyId) {
      loadViewers();
    }
  }, [open, storyId]);

  const loadViewers = async () => {
    setLoading(true);
    try {
      // Get views with profiles
      const { data: viewsData, error: viewsError } = await supabase
        .from('story_views')
        .select(`
          viewer_id,
          viewed_at,
          profiles!story_views_viewer_id_fkey(username, avatar_url)
        `)
        .eq('story_id', storyId)
        .order('viewed_at', { ascending: false });

      if (viewsError) throw viewsError;

      // Get reactions
      const { data: reactionsData } = await (supabase
        .from('story_reactions' as any) as any)
        .select('user_id, reaction')
        .eq('story_id', storyId);

      const reactionsMap = new Map(
        reactionsData?.map(r => [r.user_id, r.reaction]) || []
      );

      const formattedViewers = viewsData?.map(v => ({
        viewer_id: v.viewer_id,
        viewed_at: v.viewed_at,
        profile: Array.isArray(v.profiles) ? v.profiles[0] : v.profiles,
        reaction: reactionsMap.get(v.viewer_id)
      })) || [];

      setViewers(formattedViewers as Viewer[]);
      setTotalViews(formattedViewers.length);
      setTotalReactions(reactionsData?.length || 0);
    } catch (error) {
      console.error('Error loading viewers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Story Viewers
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{totalViews}</span>
            <span className="text-sm text-muted-foreground">views</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
            <Heart className="h-4 w-4 text-red-500" />
            <span className="font-semibold">{totalReactions}</span>
            <span className="text-sm text-muted-foreground">reactions</span>
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : viewers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No views yet
            </div>
          ) : (
            <div className="space-y-2">
              {viewers.map((viewer) => (
                <div
                  key={viewer.viewer_id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={viewer.profile?.avatar_url} />
                    <AvatarFallback>
                      {viewer.profile?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{viewer.profile?.username}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}
                    </p>
                  </div>
                  {viewer.reaction && (
                    <Badge variant="secondary" className="text-lg">
                      {viewer.reaction}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};