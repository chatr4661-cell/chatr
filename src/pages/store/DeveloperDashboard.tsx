import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, BarChart3, Settings, Eye, Star, Download, Code2, Upload, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);

  // New app form
  const [form, setForm] = useState({
    app_name: '', description: '', app_url: '', icon_url: '', category_id: '', support_email: '', privacy_policy_url: '', tags: ''
  });

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }

    // Get or create developer profile
    let { data: dev } = await supabase.from('developer_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (!dev) {
      const { data: userProfile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      const { data: newDev } = await supabase.from('developer_profiles').insert({
        user_id: user.id,
        developer_name: userProfile?.username || 'Developer',
      }).select().single();
      dev = newDev;
    }
    setProfile(dev);

    // Load submissions
    if (dev) {
      const { data: subs } = await supabase.from('app_submissions').select('*').eq('developer_id', dev.id).order('created_at', { ascending: false });
      setSubmissions(subs || []);
    }

    const { data: cats } = await supabase.from('app_categories').select('*').order('display_order');
    setCategories(cats || []);
    setLoading(false);
  };

  const submitApp = async () => {
    if (!form.app_name || !form.app_url) {
      toast.error('App name and URL are required');
      return;
    }

    const { error } = await supabase.from('app_submissions').insert({
      app_name: form.app_name,
      description: form.description,
      app_url: form.app_url,
      icon_url: form.icon_url,
      category_id: form.category_id || null,
      support_email: form.support_email,
      privacy_policy_url: form.privacy_policy_url,
      developer_id: profile?.id,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()) : null,
      submission_status: 'pending',
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      toast.error('Submission failed');
    } else {
      toast.success('App submitted for review!');
      setShowSubmit(false);
      setForm({ app_name: '', description: '', app_url: '', icon_url: '', category_id: '', support_email: '', privacy_policy_url: '', tags: '' });
      init();
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Developer Console</h1>
            <p className="text-xs text-muted-foreground">{profile?.developer_name}</p>
          </div>
          <Button size="sm" className="rounded-full gap-1" onClick={() => setShowSubmit(true)}>
            <Plus className="h-4 w-4" /> New App
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <Card className="p-3 text-center">
          <Code2 className="h-5 w-5 mx-auto text-primary mb-1" />
          <div className="font-bold text-lg">{profile?.total_apps || 0}</div>
          <span className="text-[10px] text-muted-foreground">Apps</span>
        </Card>
        <Card className="p-3 text-center">
          <Download className="h-5 w-5 mx-auto text-primary mb-1" />
          <div className="font-bold text-lg">{profile?.total_downloads || 0}</div>
          <span className="text-[10px] text-muted-foreground">Downloads</span>
        </Card>
        <Card className="p-3 text-center">
          <Star className="h-5 w-5 mx-auto text-primary mb-1" />
          <div className="font-bold text-lg">{profile?.is_verified ? '✓' : '—'}</div>
          <span className="text-[10px] text-muted-foreground">Verified</span>
        </Card>
      </div>

      {/* Submissions */}
      <Tabs defaultValue="submissions" className="px-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-2 mt-4">
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No apps submitted yet</p>
              <Button className="mt-4" onClick={() => setShowSubmit(true)}>Submit Your First App</Button>
            </div>
          ) : submissions.map(sub => (
            <Card key={sub.id} className="p-3">
              <div className="flex items-center gap-3">
                <img
                  src={sub.icon_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sub.app_name)}&background=6366f1&color=fff&size=48`}
                  alt={sub.app_name}
                  className="w-12 h-12 rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{sub.app_name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {statusIcon(sub.submission_status)}
                    <Badge variant={sub.submission_status === 'approved' ? 'default' : sub.submission_status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {sub.submission_status}
                    </Badge>
                  </div>
                  {sub.rejection_reason && (
                    <p className="text-[11px] text-destructive mt-1">{sub.rejection_reason}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card className="p-6 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Analytics coming soon</p>
            <p className="text-xs text-muted-foreground mt-1">Track installs, usage, and retention</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit Dialog */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit New App</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>App Name *</Label>
              <Input value={form.app_name} onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))} placeholder="My Amazing App" />
            </div>
            <div>
              <Label>App URL *</Label>
              <Input value={form.app_url} onChange={e => setForm(f => ({ ...f, app_url: e.target.value }))} placeholder="https://myapp.com" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your app..." rows={3} />
            </div>
            <div>
              <Label>Icon URL</Label>
              <Input value={form.icon_url} onChange={e => setForm(f => ({ ...f, icon_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="social, chat, utility" />
            </div>
            <div>
              <Label>Support Email</Label>
              <Input value={form.support_email} onChange={e => setForm(f => ({ ...f, support_email: e.target.value }))} placeholder="support@myapp.com" />
            </div>
            <div>
              <Label>Privacy Policy URL</Label>
              <Input value={form.privacy_policy_url} onChange={e => setForm(f => ({ ...f, privacy_policy_url: e.target.value }))} placeholder="https://myapp.com/privacy" />
            </div>
            <Button className="w-full" onClick={submitApp}>Submit for Review</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
