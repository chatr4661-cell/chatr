import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppleHeader } from '@/components/ui/AppleHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = ['pending', 'reviewing', 'shortlisted', 'hired', 'rejected'];

export default function ApplyManage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    const [j, a] = await Promise.all([
      supabase.from('job_listings').select('*').eq('id', jobId).maybeSingle(),
      supabase.from('job_applications').select('*, applicant:profiles!job_applications_applicant_id_fkey(id, username, avatar_url)').eq('job_id', jobId).order('created_at', { ascending: false }),
    ]);
    setJob(j.data);
    setApps(a.data || []);
    const n: Record<string, string> = {};
    (a.data || []).forEach((x: any) => { n[x.id] = x.employer_notes || ''; });
    setNotes(n);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('job_applications').update({ status, employer_notes: notes[id] || null }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked as ${status}`);
    load();
  };

  const toggleActive = async () => {
    if (!job) return;
    await supabase.from('job_listings').update({ is_active: !job.is_active }).eq('id', job.id);
    load();
  };

  return (
    <div className="min-h-screen bg-background safe-area-pb">
      <AppleHeader title="Applicants" onBack={() => navigate('/apply')} glass />
      <div className="max-w-2xl mx-auto px-4 pb-24 space-y-3 mt-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : !job ? (
          <p className="text-center text-muted-foreground py-12">Job not found</p>
        ) : (
          <>
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold">{job.title}</h2>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
                <Button size="sm" variant="outline" onClick={toggleActive}>
                  {job.is_active ? 'Close' : 'Reopen'}
                </Button>
              </div>
            </div>
            {apps.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No applications yet</p>
            ) : apps.map(app => (
              <div key={app.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{app.applicant?.username || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(app.created_at).toLocaleString()}
                      {app.expected_salary && ` · Expects ₹${app.expected_salary}`}
                    </p>
                  </div>
                  <Badge>{app.status}</Badge>
                </div>
                {app.cover_letter && (
                  <p className="text-sm bg-muted/50 rounded-lg p-2 whitespace-pre-wrap">{app.cover_letter}</p>
                )}
                <Textarea
                  placeholder="Private notes…"
                  value={notes[app.id] || ''}
                  onChange={e => setNotes({ ...notes, [app.id]: e.target.value })}
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                    <Button key={s} size="sm" variant={app.status === s ? 'default' : 'outline'} onClick={() => updateStatus(app.id, s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
