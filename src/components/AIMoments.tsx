import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Heart, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface AIMomentsProps {
  conversationSnippet?: string;
  onClear?: () => void;
}

export const AIMoments = ({ conversationSnippet, onClear }: AIMomentsProps) => {
  const [moments, setMoments] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [snippet, setSnippet] = useState('');

  useEffect(() => {
    if (conversationSnippet) {
      setSnippet(conversationSnippet);
      setShowCreate(true);
    }
  }, [conversationSnippet]);

  useEffect(() => {
    loadPublicMoments();
  }, []);

  const loadPublicMoments = async () => {
    const { data } = await supabase
      .from('ai_moments' as any)
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setMoments(data);
  };

  const createMoment = async (makePublic: boolean = false) => {
    if (!snippet.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('ai_moments' as any)
        .insert({
          user_id: user.id,
          conversation_snippet: snippet,
          is_public: makePublic
        });

      if (error) throw error;

      toast.success(makePublic ? 'Moment shared publicly!' : 'Moment saved!');
      setSnippet('');
      setShowCreate(false);
      onClear?.();
      
      if (makePublic) {
        loadPublicMoments();
      }
    } catch (error) {
      console.error('Error creating moment:', error);
      toast.error('Failed to save moment');
    }
  };

  const likeMoment = async (momentId: string) => {
    try {
      const { data } = await supabase
        .from('ai_moments' as any)
        .select('like_count')
        .eq('id', momentId)
        .single();

      if (data && 'like_count' in data) {
        await supabase
          .from('ai_moments' as any)
          .update({ like_count: (data as any).like_count + 1 })
          .eq('id', momentId);

        loadPublicMoments();
      }
    } catch (error) {
      console.error('Error liking moment:', error);
    }
  };

  const shareMoment = async (moment: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Copy to clipboard
      await navigator.clipboard.writeText(moment.conversation_snippet);
      
      // Track share
      await supabase
        .from('moment_shares' as any)
        .insert({
          moment_id: moment.id,
          shared_by: user.id,
          shared_to_platform: 'clipboard'
        });

      await supabase
        .from('ai_moments' as any)
        .update({ share_count: moment.share_count + 1 })
        .eq('id', moment.id);

      toast.success('Copied to clipboard!');
      loadPublicMoments();
    } catch (error) {
      console.error('Error sharing moment:', error);
      toast.error('Failed to share');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI Moments</h3>
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            Create
          </Button>
        </div>

        {showCreate && (
          <div className="mb-4 space-y-3">
            <Textarea
              placeholder="Capture a meaningful moment from your conversation..."
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => createMoment(false)}
                className="flex-1"
              >
                Save Private
              </Button>
              <Button 
                onClick={() => createMoment(true)}
                className="flex-1"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Public
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <h4 className="text-sm font-medium px-1">Trending Moments</h4>
        {moments.map((moment) => (
          <Card key={moment.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>@{moment.profiles?.username}</span>
                {moment.emotion_captured && (
                  <Badge variant="secondary">{moment.emotion_captured}</Badge>
                )}
              </div>
            </div>
            
            <p className="text-sm mb-3 italic border-l-2 border-primary pl-3">
              "{moment.conversation_snippet}"
            </p>

            <div className="flex items-center gap-4">
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => likeMoment(moment.id)}
              >
                <Heart className="h-4 w-4 mr-1" />
                {moment.like_count}
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => shareMoment(moment)}
              >
                <Copy className="h-4 w-4 mr-1" />
                {moment.share_count}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
