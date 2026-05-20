import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AppleHeader } from '@/components/ui/AppleHeader';
import { Briefcase, MapPin, IndianRupee, Bookmark, BookmarkCheck, Send, Plus, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type Job = {
  id: string; title: string; company: string; description: string; requirements: string | null;
  salary_min: number | null; salary_max: number | null; location: string | null;
  employment_type: string; category: string | null; is_remote: boolean; posted_by: string;
  applications_count: number; created_at: string;
};

type Application = {
  id: string; job_id: string; status: string; cover_letter: string | null;
  expected_salary: number | null; created_at: string; job?: Job;
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  reviewing: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  shortlisted: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  hired: 'bg-green-500/15 text-green-700 dark:text-green-400',
  rejected: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export default function Apply() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Post job form
  const [pj, setPj] = useState({
    title: '', company: '', description: '', requirements: '', location: '',
    salary_min: '', salary_max: '', employment_type: 'full-time', category: '', is_remote: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate('/auth'); return; }
      setUserId(data.user.id);
    });
  }, [navigate]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [jobsR, appsR, savedR, myR] = await Promise.all([
      supabase.from('job_listings').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(100),
      supabase.from('job_applications').select('*, job:job_listings(*)').eq('applicant_id', userId).order('created_at', { ascending: false }),
      supabase.from('job_saved').select('job_id').eq('user_id', userId),
      supabase.from('job_listings').select('*').eq('posted_by', userId).order('created_at', { ascending: false }),
    ]);
    if (jobsR.data) setJobs(jobsR.data as Job[]);
    if (appsR.data) setApplications(appsR.data as Application[]);
    if (savedR.data) setSaved(new Set(savedR.data.map((s: any) => s.job_id)));
    if (myR.data) setMyJobs(myR.data as Job[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel('apply-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_listings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_applications', filter: `applicant_id=eq.${userId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);

  const toggleSave = async (jobId: string) => {
    if (!userId) return;
    if (saved.has(jobId)) {
      await supabase.from('job_saved').delete().eq('user_id', userId).eq('job_id', jobId);
      setSaved(s => { const n = new Set(s); n.delete(jobId); return n; });
    } else {
      await supabase.from('job_saved').insert({ user_id: userId, job_id: jobId });
      setSaved(s => new Set(s).add(jobId));
    }
  };

  const openApply = (job: Job) => {
    if (applications.some(a => a.job_id === job.id)) {
      toast.info('You have already applied to this job');
      return;
    }
    setSelectedJob(job);
    setCoverLetter('');
    setExpectedSalary('');
    setApplyOpen(true);
  };

  const submitApplication = async () => {
    if (!userId || !selectedJob) return;
    setSubmitting(true);
    const { error } = await supabase.from('job_applications').insert({
      job_id: selectedJob.id,
      applicant_id: userId,
      cover_letter: coverLetter || null,
      expected_salary: expectedSalary ? parseInt(expectedSalary) : null,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Application submitted');
    setApplyOpen(false);
    load();
  };

  const submitPost = async () => {
    if (!userId) return;
    if (!pj.title || !pj.company || !pj.description) { toast.error('Title, company and description are required'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('job_listings').insert({
      posted_by: userId,
      title: pj.title, company: pj.company, description: pj.description,
      requirements: pj.requirements || null, location: pj.location || null,
      salary_min: pj.salary_min ? parseInt(pj.salary_min) : null,
      salary_max: pj.salary_max ? parseInt(pj.salary_max) : null,
      employment_type: pj.employment_type, category: pj.category || null,
      is_remote: pj.is_remote, is_active: true,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Job posted');
    setPostOpen(false);
    setPj({ title: '', company: '', description: '', requirements: '', location: '', salary_min: '', salary_max: '', employment_type: 'full-time', category: '', is_remote: false });
    load();
  };

  const filteredJobs = jobs.filter(j =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase()) ||
    (j.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const fmtSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `₹${(min / 1000).toFixed(0)}k - ₹${(max / 1000).toFixed(0)}k`;
    return `₹${((min || max)! / 1000).toFixed(0)}k`;
  };

  return (
    <div className="min-h-screen bg-background safe-area-pb">
      <AppleHeader title="Apply" onBack={() => navigate('/')} glass />

      <div className="max-w-2xl mx-auto px-4 pb-24">
        <Tabs defaultValue="browse" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="applied">Applied ({applications.length})</TabsTrigger>
            <TabsTrigger value="posted">Posted ({myJobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-3 mt-4">
            <div className="flex gap-2">
              <Input placeholder="Search jobs, companies, location…" value={search} onChange={e => setSearch(e.target.value)} />
              <Button variant="outline" onClick={() => navigate('/jobs')}>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No jobs found</p>
              </div>
            ) : filteredJobs.map(job => (
              <div key={job.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                  </div>
                  <button onClick={() => toggleSave(job.id)} className="p-1">
                    {saved.has(job.id) ? <BookmarkCheck className="w-5 h-5 text-primary" /> : <Bookmark className="w-5 h-5 text-muted-foreground" />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {job.location && <Badge variant="secondary"><MapPin className="w-3 h-3 mr-1" />{job.location}</Badge>}
                  {job.is_remote && <Badge variant="secondary">Remote</Badge>}
                  <Badge variant="secondary">{job.employment_type}</Badge>
                  {fmtSalary(job.salary_min, job.salary_max) && (
                    <Badge variant="secondary"><IndianRupee className="w-3 h-3" />{fmtSalary(job.salary_min, job.salary_max)}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">{job.applications_count} applicants</span>
                  <Button size="sm" onClick={() => openApply(job)}>
                    <Send className="w-3 h-3 mr-1" />Apply
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="applied" className="space-y-3 mt-4">
            {applications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No applications yet</div>
            ) : applications.map(app => (
              <div key={app.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{app.job?.title || 'Job'}</h3>
                    <p className="text-sm text-muted-foreground">{app.job?.company}</p>
                  </div>
                  <Badge className={STATUS_COLORS[app.status] || ''}>{app.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Applied {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="posted" className="space-y-3 mt-4">
            <Button onClick={() => setPostOpen(true)} className="w-full">
              <Plus className="w-4 h-4 mr-1" />Post a Job
            </Button>
            {myJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No jobs posted yet</div>
            ) : myJobs.map(job => (
              <div key={job.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                  </div>
                  <Badge variant={job.is_active ? 'default' : 'secondary'}>
                    {job.is_active ? 'Active' : 'Closed'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{job.applications_count} applicants</span>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/apply/manage/${job.id}`)}>
                    View applicants
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Apply dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply to {selectedJob?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Cover letter (optional)" value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={6} />
            <Input type="number" placeholder="Expected salary (₹/month)" value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={submitApplication} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post job dialog */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Post a Job</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Job title *" value={pj.title} onChange={e => setPj({ ...pj, title: e.target.value })} />
            <Input placeholder="Company *" value={pj.company} onChange={e => setPj({ ...pj, company: e.target.value })} />
            <Textarea placeholder="Description *" value={pj.description} onChange={e => setPj({ ...pj, description: e.target.value })} rows={4} />
            <Textarea placeholder="Requirements" value={pj.requirements} onChange={e => setPj({ ...pj, requirements: e.target.value })} rows={3} />
            <Input placeholder="Location" value={pj.location} onChange={e => setPj({ ...pj, location: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Min salary" value={pj.salary_min} onChange={e => setPj({ ...pj, salary_min: e.target.value })} />
              <Input type="number" placeholder="Max salary" value={pj.salary_max} onChange={e => setPj({ ...pj, salary_max: e.target.value })} />
            </div>
            <Input placeholder="Category (eg. Engineering)" value={pj.category} onChange={e => setPj({ ...pj, category: e.target.value })} />
            <select className="w-full bg-background border border-input rounded-md h-10 px-3 text-sm"
              value={pj.employment_type} onChange={e => setPj({ ...pj, employment_type: e.target.value })}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="gig">Gig</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pj.is_remote} onChange={e => setPj({ ...pj, is_remote: e.target.checked })} />
              Remote
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostOpen(false)}>Cancel</Button>
            <Button onClick={submitPost} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
