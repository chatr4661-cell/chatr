import { Trophy, TrendingUp, Coins, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FameLeaderboard() {
  const navigate = useNavigate();

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['fame-leaderboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fame_leaderboard')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .order('total_fame_score', { ascending: false })
        .limit(50);
      return data || [];
    }
  });

  const { data: topPosts = [] } = useQuery({
    queryKey: ['top-fame-posts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fame_cam_posts')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('is_viral', true)
        .order('ai_virality_score', { ascending: false })
        .limit(20);
      return data || [];
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/60 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white mb-4"
          >
            ← Back
          </Button>
          
          <div className="text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Fame Leaderboard</h1>
            <p className="text-white/80">Top creators & viral content</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="creators" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="creators">Top Creators</TabsTrigger>
            <TabsTrigger value="posts">Viral Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="creators" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading leaderboard...
              </div>
            ) : leaderboard.length === 0 ? (
              <Card className="p-12 text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No creators yet!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Be the first to create viral content
                </p>
                <Button onClick={() => navigate('/fame-cam')}>
                  Start Creating
                </Button>
              </Card>
            ) : (
              leaderboard.map((entry: any, idx: number) => {
                const isTop3 = idx < 3;
                const rankEmojis = ['🥇', '🥈', '🥉'];
                
                return (
                  <Card
                    key={entry.id}
                    className={`p-4 ${isTop3 ? 'border-primary bg-accent/50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold w-12 text-center">
                        {isTop3 ? rankEmojis[idx] : `#${idx + 1}`}
                      </div>
                      
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={entry.profiles?.avatar_url} />
                        <AvatarFallback>
                          {entry.profiles?.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {entry.profiles?.username || 'Unknown'}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {entry.total_fame_score} fame
                          </span>
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {entry.total_posts} posts
                          </span>
                          <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-yellow-500" />
                            {entry.total_coins_earned}
                          </span>
                        </div>
                      </div>

                      {entry.total_viral_posts > 0 && (
                        <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-500/30">
                          🔥 {entry.total_viral_posts} viral
                        </Badge>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            {topPosts.length === 0 ? (
              <Card className="p-12 text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No viral posts yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create content and go viral!
                </p>
                <Button onClick={() => navigate('/fame-cam')}>
                  Create Post
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {topPosts.map((post: any) => (
                  <Card key={post.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                    <div className="relative aspect-square">
                      <img
                        src={post.media_url}
                        alt="Viral post"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-red-500/90 text-white">
                          🔥 {post.ai_virality_score}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={post.profiles?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {post.profiles?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate">
                          {post.profiles?.username}
                        </span>
                      </div>
                      {post.caption && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {post.caption}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>{post.views_count || 0} views</span>
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3 text-yellow-500" />
                          {post.coins_earned}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <Card className="mt-8 p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="text-center">
            <Camera className="w-12 h-12 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Ready to go viral?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create content with AI guidance and earn Chatr Coins
            </p>
            <Button onClick={() => navigate('/fame-cam')} size="lg">
              Open FameCam
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
