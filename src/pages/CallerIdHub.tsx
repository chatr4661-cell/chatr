import React, { useState } from 'react';
import { Shield, Flag, TrendingUp, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CallerIdLookup } from '@/components/callerid/CallerIdLookup';
import { ReportCallerSheet } from '@/components/callerid/ReportCallerSheet';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';

export default function CallerIdHub() {
  const [reportOpen, setReportOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Caller ID - Community Spam Protection | Chatr"
        description="Look up phone numbers and report spam callers. Powered by community reports."
        keywords="caller id, spam, scam, truecaller, phone lookup"
      />
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">Caller ID</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => setReportOpen(true)}
            >
              <Flag className="w-4 h-4 mr-1" />
              Report
            </Button>
          </div>
        </div>

        <div className="p-4">
          <Tabs defaultValue="lookup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lookup">
                <Shield className="w-4 h-4 mr-1" />
                Lookup
              </TabsTrigger>
              <TabsTrigger value="trending">
                <TrendingUp className="w-4 h-4 mr-1" />
                Trending Spam
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lookup" className="mt-4">
              <CallerIdLookup />
            </TabsContent>

            <TabsContent value="trending" className="mt-4">
              <TrendingSpam />
            </TabsContent>
          </Tabs>
        </div>

        <ReportCallerSheet open={reportOpen} onOpenChange={setReportOpen} />
      </div>
    </>
  );
}

function TrendingSpam() {
  const [spammers, setSpammers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { supabase } = React.useMemo(() => ({ supabase: require('@/integrations/supabase/client').supabase }), []);

  React.useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('caller_id_aggregates' as any)
        .select('*')
        .gte('spam_percentage', 60)
        .order('total_reports', { ascending: false })
        .limit(20);
      setSpammers(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="text-center text-muted-foreground py-8">Loading...</p>;

  return (
    <div className="space-y-2">
      {spammers.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No spam reports yet. Be the first!</p>
      ) : (
        spammers.map((s: any) => (
          <div key={s.phone_number} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">{s.community_name || s.phone_number}</p>
              <p className="text-xs text-muted-foreground">{s.phone_number} · {s.total_reports} reports</p>
            </div>
            <span className={`text-sm font-bold ${s.spam_percentage >= 80 ? 'text-red-500' : 'text-orange-500'}`}>
              {Math.round(s.spam_percentage)}% spam
            </span>
          </div>
        ))
      )}
    </div>
  );
}
