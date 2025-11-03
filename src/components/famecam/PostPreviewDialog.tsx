import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Instagram, Youtube, Share2, Sparkles, TrendingUp, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PostPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onSuccess: () => void;
}

export default function PostPreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  onSuccess
}: PostPreviewDialogProps) {
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(true);

  useEffect(() => {
    if (open && imageUrl) {
      analyzeContent();
    }
  }, [open, imageUrl]);

  const analyzeContent = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-fame-content', {
        body: { 
          imageData: imageUrl,
          category: 'General',
          analysisType: 'optimization'
        }
      });

      if (error) throw error;

      setAnalysis(data.analysis || {});
      setCaption(data.analysis?.enhancedCaption || "");
      setHashtags(data.analysis?.hashtags || ["#FameCam", "#Viral", "#Trending"]);
    } catch (error) {
      console.error('Analysis error:', error);
      setHashtags(["#FameCam", "#Viral", "#Trending"]);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePost = async () => {
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `fame-${user.id}-${Date.now()}.jpg`;
      const blob = await fetch(imageUrl).then(r => r.blob());
      
      const { error: uploadError } = await supabase.storage
        .from('social-media')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(fileName);

      // Create fame post with user_id
      const { error: postError } = await supabase
        .from('fame_cam_posts')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: 'photo',
          caption: caption,
          hashtags: hashtags,
          ai_virality_score: analysis?.fameScore || 75,
          is_viral: (analysis?.fameScore || 75) >= 80,
          coins_earned: analysis?.viralPrediction?.estimatedCoins || 50
        });

      if (postError) throw postError;

      const baseCoins = 10;
      const viralBonus = analysis?.viralPrediction?.estimatedCoins || 0;
      const totalCoins = baseCoins + viralBonus;

      const { data: pointsData } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('user_points')
        .update({ balance: (pointsData?.balance || 0) + totalCoins })
        .eq('user_id', user.id);

      await supabase
        .from('point_transactions')
        .insert({
          user_id: user.id,
          amount: totalCoins,
          transaction_type: 'earn',
          source: 'fame_cam',
          description: `FameCam post reward: ${totalCoins} coins`
        });

      toast.success(`Posted! You earned ${totalCoins} Chatr Coins 🪙`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Post error:', error);
      toast.error('Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const fameScore = analysis?.fameScore || 75;
  const viralLikelihood = analysis?.viralPrediction?.likelihood || 'medium';
  const estimatedCoins = analysis?.viralPrediction?.estimatedCoins || 50;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Post Your Fame
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative rounded-lg overflow-hidden">
            <img src={imageUrl} alt="Preview" className="w-full h-auto" />
            
            {analyzing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center text-white">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>AI analyzing your content...</p>
                </div>
              </div>
            )}
          </div>

          {!analyzing && analysis && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-lg p-4 border border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Fame Score</span>
                  <span className="text-2xl font-bold text-primary">{fameScore}/100</span>
                </div>
                <Progress value={fameScore} className="h-3" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
                  <p className="text-xs text-muted-foreground">Viral Chance</p>
                  <p className="font-bold capitalize">{viralLikelihood}</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <DollarSign className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                  <p className="text-xs text-muted-foreground">Est. Coins</p>
                  <p className="font-bold">+{estimatedCoins}</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <Share2 className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Est. Reach</p>
                  <p className="font-bold">{analysis.viralPrediction?.estimatedReach || '5k+'}</p>
                </div>
              </div>

              {analysis.optimizations && analysis.optimizations.length > 0 && (
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Optimization Tips
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {analysis.optimizations.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Caption</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write an engaging caption..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">AI Suggested Hashtags</label>
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag, idx) => (
                <Badge key={idx} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Share To</label>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" disabled>
                <Instagram className="w-4 h-4 mr-2" />
                Instagram
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
                TikTok
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                <Youtube className="w-4 h-4 mr-2" />
                Shorts
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cross-platform sharing coming soon!
            </p>
          </div>

          <Button
            onClick={handlePost}
            disabled={posting || !caption.trim()}
            className="w-full"
            size="lg"
          >
            {posting ? 'Posting...' : `Post & Earn ${estimatedCoins} Coins 🪙`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
