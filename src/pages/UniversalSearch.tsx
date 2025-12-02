import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CategoryCard } from "@/components/search/CategoryCard";
import { ChatrResult } from "@/lib/chatrClient";

export default function UniversalSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<ChatrResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState("");
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);
    setAiAnswer("");
    setSources([]);

    try {
      let sessionId = localStorage.getItem('chatr_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('chatr_session_id', sessionId);
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('universal-search', {
        body: {
          query,
          sessionId,
          userId: user?.id || null,
          gpsLat: null,
          gpsLon: null
        }
      });

      if (error) throw error;

      if (data) {
        setAiAnswer(data.aiAnswer?.text || '');
        setSources(data.aiAnswer?.sources || []);

        const mappedResults: ChatrResult[] = (data.results || []).map((r: any, idx: number) => ({
          id: r.url || `result-${idx}`,
          name: r.title,
          description: r.snippet,
          url: r.url || r.link,
          detectedType: r.detectedType || 'web',
          category: r.detectedType || 'web',
          rating: r.rating,
          rating_count: r.rating_count,
          distance: r.distance,
          address: r.displayUrl,
          phone: r.phone,
          image_url: r.faviconUrl || r.image,
          verified: r.verified,
          services: r.services || [],
          price: r.price
        }));

        setResults(mappedResults);
        setSearchParams({ q: query });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Error',
        description: 'Search failed. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = async (url?: string) => {
    if (!url) return;

    try {
      await supabase.functions.invoke('click-log', {
        body: {
          query,
          clickedUrl: url,
          resultTitle: results.find(r => r.url === url)?.name
        }
      });
    } catch (error) {
      console.error('Click tracking error:', error);
    }

    window.open(url, '_blank');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleDirections = (lat?: number, lon?: number) => {
    if (lat && lon) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
    }
  };

  const handleBook = () => {
    toast({
      title: "Booking",
      description: "Opening booking interface...",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Universal AI Search</h1>
          <p className="text-muted-foreground">Ask anything. Find everything. Instantly.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Find plumber, order food, doctor, jobs..."
              className="pl-10 rounded-full"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} className="rounded-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </Button>
        </div>

        {aiAnswer && (
          <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg text-primary">AI Summary</h3>
            </div>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap mb-4">
              {aiAnswer}
            </p>
            {sources.length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {sources.slice(0, 5).map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      [{idx + 1}] {source.title?.substring(0, 40)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium mb-1">Searching the web...</p>
            <p className="text-xs text-muted-foreground">Powered by Google Custom Search + AI</p>
          </div>
        ) : results.length === 0 && query ? (
          <div className="text-center py-16">
            <Search className="w-20 h-20 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-muted-foreground mb-4">Try different keywords</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((result, idx) => (
              <div key={idx} onClick={() => result.url && handleResultClick(result.url)}>
                <CategoryCard
                  result={result}
                  onCall={handleCall}
                  onDirections={handleDirections}
                  onBook={handleBook}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
