import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Bookmark, X, Check, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Highlight {
  id: string;
  user_id: string;
  title: string;
  cover_url?: string;
  stories: string[];
  created_at: string;
}

interface StoryHighlightsProps {
  userId: string;
  isOwnProfile?: boolean;
  onHighlightClick?: (highlight: Highlight) => void;
}

export const StoryHighlights = ({ 
  userId, 
  isOwnProfile = false,
  onHighlightClick 
}: StoryHighlightsProps) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedStories, setSelectedStories] = useState<string[]>([]);
  const [availableStories, setAvailableStories] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadHighlights();
  }, [userId]);

  const loadHighlights = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('story_highlights' as any) as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHighlights((data || []) as Highlight[]);
    } catch (error) {
      console.error('Error loading highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStories = async () => {
    try {
      // Get all stories (including expired) for creating highlights
      const { data, error } = await supabase
        .from('stories')
        .select('id, media_url, media_type, caption, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAvailableStories(data || []);
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const handleCreateHighlight = async () => {
    if (!newTitle.trim() || selectedStories.length === 0) {
      toast.error('Please add a title and select at least one story');
      return;
    }

    setCreating(true);
    try {
      // Get cover from first selected story
      const firstStory = availableStories.find(s => s.id === selectedStories[0]);
      
      const { error } = await (supabase
        .from('story_highlights' as any) as any)
        .insert({
          user_id: userId,
          title: newTitle,
          cover_url: firstStory?.media_url,
          stories: selectedStories
        });

      if (error) throw error;

      toast.success('Highlight created!');
      setShowCreate(false);
      setNewTitle('');
      setSelectedStories([]);
      loadHighlights();
    } catch (error) {
      console.error('Error creating highlight:', error);
      toast.error('Failed to create highlight');
    } finally {
      setCreating(false);
    }
  };

  const toggleStorySelection = (storyId: string) => {
    setSelectedStories(prev => 
      prev.includes(storyId)
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId]
    );
  };

  const handleOpenCreate = () => {
    loadAvailableStories();
    setShowCreate(true);
  };

  if (loading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-muted" />
            <div className="w-12 h-3 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide">
        {isOwnProfile && (
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Button 
              onClick={handleOpenCreate} 
              variant="outline" 
              className="w-16 h-16 rounded-full border-2 border-dashed p-0"
            >
              <Plus className="h-6 w-6" />
            </Button>
            <span className="text-xs text-muted-foreground">New</span>
          </div>
        )}

        {highlights.map((highlight) => (
          <div 
            key={highlight.id} 
            className="flex flex-col items-center gap-2 shrink-0 cursor-pointer"
            onClick={() => onHighlightClick?.(highlight)}
          >
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-gray-300 to-gray-400">
              <Avatar className="w-16 h-16 border-2 border-background">
                <AvatarImage src={highlight.cover_url || undefined} />
                <AvatarFallback className="bg-muted">
                  <Bookmark className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs max-w-[64px] truncate">{highlight.title}</span>
          </div>
        ))}
      </div>

      {/* Create Highlight Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Create Highlight
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Highlight name..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />

            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Select stories ({selectedStories.length} selected)
              </p>
              <ScrollArea className="h-[200px] border rounded-lg p-2">
                <div className="grid grid-cols-3 gap-2">
                  {availableStories.map((story) => (
                    <div
                      key={story.id}
                      onClick={() => toggleStorySelection(story.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedStories.includes(story.id)
                          ? 'border-primary'
                          : 'border-transparent'
                      }`}
                    >
                      {story.media_type === 'text' ? (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center p-2">
                          <p className="text-white text-xs text-center line-clamp-3">
                            {story.caption}
                          </p>
                        </div>
                      ) : (
                        <img
                          src={story.media_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                      {selectedStories.includes(story.id) && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Button 
              onClick={handleCreateHighlight} 
              disabled={creating || !newTitle.trim() || selectedStories.length === 0}
              className="w-full"
            >
              {creating ? 'Creating...' : 'Create Highlight'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};