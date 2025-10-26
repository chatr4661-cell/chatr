import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BrandSuggestion {
  brand_id: string;
  brand_name: string;
  response_type: 'sticker' | 'ar_suggest' | 'banner';
  response_asset_url: string;
  trigger_id: string;
}

interface ChatBrandSuggestionProps {
  message: string;
  conversationId: string;
}

export default function ChatBrandSuggestion({ message, conversationId }: ChatBrandSuggestionProps) {
  const [suggestion, setSuggestion] = useState<BrandSuggestion | null>(null);

  useEffect(() => {
    if (!message || message.length < 3) return;

    const checkForBrands = async () => {
      try {
        const { data } = await supabase.functions.invoke('analyze-chat-brands', {
          body: { message, conversationId }
        });

        if (data?.suggestions && data.suggestions.length > 0) {
          setSuggestion(data.suggestions[0]);
        }
      } catch (error) {
        console.error('Error checking chat brands:', error);
      }
    };

    const debounce = setTimeout(checkForBrands, 500);
    return () => clearTimeout(debounce);
  }, [message, conversationId]);

  const handleDismiss = () => setSuggestion(null);

  const handleClick = async () => {
    if (!suggestion) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.rpc('track_brand_impression', {
        p_brand_id: suggestion.brand_id,
        p_placement_id: null,
        p_user_id: user?.id || null,
        p_impression_type: 'interaction',
        p_detected_object: 'chat_suggestion',
        p_duration: 0
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  return (
    <AnimatePresence>
      {suggestion && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="mb-2"
        >
          {suggestion.response_type === 'sticker' && (
            <div className="relative inline-block group">
              <button
                onClick={handleClick}
                className="relative hover:scale-105 transition-transform"
              >
                <img
                  src={suggestion.response_asset_url}
                  alt={suggestion.brand_name}
                  className="w-24 h-24 object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                  <span className="text-white text-xs font-medium">{suggestion.brand_name}</span>
                </div>
              </button>
              <button
                onClick={handleDismiss}
                className="absolute -top-2 -right-2 bg-background rounded-full p-1 shadow-lg hover:bg-accent"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {suggestion.response_type === 'banner' && (
            <div className="relative bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-lg p-3 border border-primary/30">
              <button
                onClick={handleDismiss}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-accent"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-3" onClick={handleClick}>
                <img
                  src={suggestion.response_asset_url}
                  alt={suggestion.brand_name}
                  className="w-12 h-12 rounded object-contain bg-white/90"
                />
                <div>
                  <p className="text-sm font-medium">Suggested by {suggestion.brand_name}</p>
                  <p className="text-xs text-muted-foreground">Tap to learn more</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
