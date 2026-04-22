import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Coins, IndianRupee } from 'lucide-react';

interface EarningEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  reward_coins: number;
  reward_rupees: number;
  occurred_at: string;
}

export default function EarnHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EarningEvent[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('earning_events')
        .select('id, title, description, event_type, status, reward_coins, reward_rupees, occurred_at')
        .order('occurred_at', { ascending: false })
        .limit(100);

      if (!error) setEvents((data || []) as EarningEvent[]);
      setLoading(false);
    };

    loadHistory();
  }, []);

  const badgeVariant = (status: EarningEvent['status']) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/earn')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Earning History</h1>
            <p className="text-xs text-muted-foreground">Every reward event, timestamp, and payout state</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-3 p-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No earning history yet</p>
          </div>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{event.title}</p>
                    <Badge variant={badgeVariant(event.status)}>{event.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description || event.event_type}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(event.occurred_at), 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 font-medium">
                    <IndianRupee className="h-3.5 w-3.5" />
                    <span>{Number(event.reward_rupees || 0).toFixed(2)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-1 text-sm text-muted-foreground">
                    <Coins className="h-3.5 w-3.5" />
                    <span>{event.reward_coins || 0} coins</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
