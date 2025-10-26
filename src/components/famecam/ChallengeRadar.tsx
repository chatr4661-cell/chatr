import { Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ChallengeRadar() {
  const { data: challenges = [] } = useQuery({
    queryKey: ['active-challenges'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fame_cam_challenges')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  const activeCount = challenges.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="relative bg-black/60 backdrop-blur-sm border border-primary/30 hover:bg-black/70"
        >
          <Target className="w-4 h-4 mr-2" />
          Challenges
          {activeCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-background/95 backdrop-blur-xl border-primary/30">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Active Challenges
          </h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {challenges.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No active challenges right now</p>
              <p className="text-sm mt-1">Check back soon!</p>
            </div>
          ) : (
            challenges.map((challenge: any) => (
              <div key={challenge.id} className="p-4 border-b border-border/50 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{challenge.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{challenge.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        🪙 {challenge.reward_coins} coins
                      </Badge>
                      {challenge.duration_seconds && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {challenge.duration_seconds}s
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {challenge.difficulty}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
