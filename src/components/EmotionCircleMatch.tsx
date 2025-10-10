import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MoodPicker } from '@/components/wellness/MoodPicker';
import { Users, Heart, X } from 'lucide-react';
import { toast } from 'sonner';

export const EmotionCircleMatch = () => {
  const [currentMood, setCurrentMood] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [isLooking, setIsLooking] = useState(false);
  const [loading, setLoading] = useState(false);

  const startLooking = async () => {
    if (!currentMood) {
      toast.error('Select your mood first');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Join emotion circle
      await supabase
        .from('emotion_circles' as any)
        .insert({
          user_id: user.id,
          current_emotion: currentMood,
          intensity: 3,
          looking_for_connection: true
        });

      setIsLooking(true);
      findMatches();
      toast.success('Looking for people who feel the same...');
    } catch (error) {
      console.error('Error joining circle:', error);
      toast.error('Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const findMatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.rpc('find_emotion_matches', {
        p_user_id: user.id,
        p_emotion: currentMood
      } as any);

      if (data) {
        setMatches(data);
      }
    } catch (error) {
      console.error('Error finding matches:', error);
    }
  };

  const connectWith = async (matchUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create conversation
      const { data } = await supabase.rpc('create_direct_conversation', {
        other_user_id: matchUserId
      });

      if (data) {
        toast.success('Connection made! Check your chats');
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Failed to connect');
    }
  };

  const stopLooking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('emotion_circles' as any)
        .update({ looking_for_connection: false })
        .eq('user_id', user.id);

      setIsLooking(false);
      setMatches([]);
    } catch (error) {
      console.error('Error stopping:', error);
    }
  };

  useEffect(() => {
    if (isLooking) {
      const interval = setInterval(findMatches, 5000);
      return () => clearInterval(interval);
    }
  }, [isLooking, currentMood]);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Find Your Circle</h3>
      </div>

      {!isLooking ? (
        <div className="space-y-4">
          <MoodPicker value={currentMood} onChange={setCurrentMood} />
          <Button 
            onClick={startLooking}
            disabled={loading || !currentMood}
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            Find People Who Feel the Same
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="animate-pulse">
              Looking for connections...
            </Badge>
            <Button size="sm" variant="ghost" onClick={stopLooking}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Searching for people who feel {currentMood}...
              </p>
            ) : (
              matches.map((match) => (
                <div key={match.match_user_id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={match.avatar_url} />
                      <AvatarFallback>{match.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{match.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Feeling {match.emotion}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => connectWith(match.match_user_id)}
                  >
                    Connect
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
