import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Send, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface StoryReactionsProps {
  storyId: string;
  storyUserId: string;
  currentUserId: string;
  onReplySubmit?: () => void;
}

const QUICK_REACTIONS = ['❤️', '🔥', '😍', '😂', '😮', '👏'];

export const StoryReactions = ({ 
  storyId, 
  storyUserId, 
  currentUserId,
  onReplySubmit 
}: StoryReactionsProps) => {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [heartAnimation, setHeartAnimation] = useState(false);

  const handleReaction = async (emoji: string) => {
    try {
      // Record reaction in story_reactions table
      await (supabase.from('story_reactions' as any) as any).upsert({
        story_id: storyId,
        user_id: currentUserId,
        reaction: emoji,
        created_at: new Date().toISOString()
      }, { onConflict: 'story_id,user_id' });

      // Show animation for heart
      if (emoji === '❤️') {
        setHeartAnimation(true);
        setTimeout(() => setHeartAnimation(false), 1000);
      }

      toast.success('Reaction sent!');
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || sending) return;

    setSending(true);
    try {
      // Create or get conversation with story owner
      const { data: conversationId, error: convError } = await supabase.rpc(
        'create_direct_conversation',
        { other_user_id: storyUserId }
      );

      if (convError) throw convError;

      // Send reply as a message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: `Replied to your story: "${reply}"`,
        message_type: 'text',
        metadata: { story_reply: true, story_id: storyId }
      });

      toast.success('Reply sent!');
      setReply('');
      onReplySubmit?.();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const isOwnStory = storyUserId === currentUserId;

  if (isOwnStory) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
      {/* Heart animation */}
      <AnimatePresence>
        {heartAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2"
          >
            <Heart className="h-20 w-20 text-red-500 fill-red-500" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick reactions */}
      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex justify-center gap-2 mb-3"
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  handleReaction(emoji);
                  setShowReactions(false);
                }}
                className="text-2xl hover:scale-125 transition-transform p-2 bg-white/10 rounded-full backdrop-blur-sm"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowReactions(!showReactions)}
          className="shrink-0 text-white hover:bg-white/20"
        >
          <Heart className="h-6 w-6" />
        </Button>

        <div className="flex-1 relative">
          <Input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply to story..."
            className="bg-white/20 border-white/30 text-white placeholder:text-white/60 pr-10"
            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
          />
          {reply.trim() && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleReply}
              disabled={sending}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-white hover:bg-white/20"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction('❤️')}
          className="shrink-0 text-white hover:bg-white/20"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};