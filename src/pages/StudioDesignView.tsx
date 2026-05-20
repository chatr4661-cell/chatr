import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppleHeader } from '@/components/ui/AppleHeader';
import { Button } from '@/components/ui/button';
import { Download, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StudioDesignView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [design, setDesign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('studio_user_designs' as any)
      .select('id,name,thumbnail_url,is_published,created_at')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setDesign(data);
        setLoading(false);
      });
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: design?.name, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
    } catch {}
  };

  const handleDownload = () => {
    if (!design?.thumbnail_url) return;
    const a = document.createElement('a');
    a.href = design.thumbnail_url;
    a.download = `${design.name}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background safe-area-pb">
      <AppleHeader title="Design" onBack={() => navigate(-1)} glass />
      <div className="max-w-xl mx-auto px-4 mt-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : !design ? (
          <p className="text-center text-muted-foreground py-12">Design not found or not published</p>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="aspect-square bg-muted/30 flex items-center justify-center">
              {design.thumbnail_url ? (
                <img src={design.thumbnail_url} alt={design.name} className="w-full h-full object-contain" />
              ) : <span className="text-5xl">🎨</span>}
            </div>
            <div className="p-4 space-y-3">
              <h2 className="font-semibold">{design.name}</h2>
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1"><Download className="w-4 h-4 mr-1" />Download</Button>
                <Button variant="outline" onClick={handleShare}><Share2 className="w-4 h-4" /></Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => navigate('/chatr-studio')}>Create your own in Studio</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
