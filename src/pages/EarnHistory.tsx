import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, XCircle, Clock, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SubmissionWithTask {
  id: string;
  status: string;
  created_at: string;
  rejection_reason: string | null;
  task: {
    title: string;
    task_type: string;
    reward_rupees: number;
  } | null;
}

export default function EarnHistory() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from('micro_task_submissions')
        .select(`
          id,
          status,
          created_at,
          rejection_reason,
          task:micro_tasks (
            title,
            task_type,
            reward_rupees
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setSubmissions(data as SubmissionWithTask[]);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [userId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'auto_approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
      case 'auto_rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
      case 'manual_review':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'auto_approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
      case 'auto_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Task History</h1>
            <p className="text-xs text-muted-foreground">Your completed tasks</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No task history yet</p>
            <Button className="mt-4" onClick={() => navigate('/earn')}>
              Start Earning
            </Button>
          </div>
        ) : (
          submissions.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(sub.status)}
                    <div>
                      <p className="font-medium">{sub.task?.title || 'Unknown Task'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sub.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                      {sub.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">{sub.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(sub.status)}
                    {(sub.status === 'approved' || sub.status === 'auto_approved') && (
                      <div className="flex items-center justify-end mt-1 text-green-600 font-semibold">
                        <IndianRupee className="w-3 h-3" />
                        <span>{sub.task?.reward_rupees || 0}</span>
                      </div>
                    )}
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
