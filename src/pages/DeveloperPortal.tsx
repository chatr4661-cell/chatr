import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Code, BarChart3, Upload, CheckCircle, XCircle, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface DeveloperProfile {
  id: string;
  developer_name: string;
  is_verified: boolean;
  total_apps: number;
  portal_enabled: boolean;
}

interface AppSubmission {
  id: string;
  app_name: string;
  description: string;
  submission_status: string;
  submitted_at: string;
  rejection_reason?: string;
}

const DeveloperPortal = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [submissions, setSubmissions] = useState<AppSubmission[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [appName, setAppName] = useState('');
  const [description, setDescription] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('');

  useEffect(() => {
    loadDeveloperData();
  }, []);

  const loadDeveloperData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load developer profile
      const { data: devProfile } = await supabase
        .from('developer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!devProfile) {
        // Create developer profile
        const { data: newProfile } = await supabase
          .from('developer_profiles')
          .insert({
            user_id: user.id,
            developer_name: user.email?.split('@')[0] || 'Developer',
            portal_enabled: true
          })
          .select()
          .single();
        setProfile(newProfile);
      } else {
        setProfile(devProfile);
      }

      // Load submissions
      const { data: subs } = await supabase
        .from('app_submissions')
        .select('*')
        .eq('developer_id', devProfile?.id || '')
        .order('submitted_at', { ascending: false });
      
      if (subs) setSubmissions(subs);

      // Load categories
      const { data: cats } = await supabase
        .from('app_categories')
        .select('*')
        .order('display_order');
      
      if (cats) setCategories(cats);

      setLoading(false);
    } catch (error) {
      console.error('Error loading developer data:', error);
      toast.error('Failed to load developer portal');
    }
  };

  const handleSubmitApp = async () => {
    if (!profile) {
      toast.error('Developer profile not found');
      return;
    }

    if (!appName || !appUrl || !categoryId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('app_submissions')
        .insert({
          developer_id: profile.id,
          app_name: appName,
          description,
          app_url: appUrl,
          category_id: categoryId,
          icon_url: iconUrl,
          support_email: supportEmail
        });

      if (error) throw error;

      toast.success('App submitted for review! 🎉');
      
      // Reset form
      setAppName('');
      setDescription('');
      setAppUrl('');
      setCategoryId('');
      setIconUrl('');
      setSupportEmail('');
      
      loadDeveloperData();
    } catch (error) {
      console.error('Error submitting app:', error);
      toast.error('Failed to submit app');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'revision_needed':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Needs Revision</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading Developer Portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 p-3 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Code className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Developer Portal</h1>
          </div>
          {profile?.is_verified && (
            <Badge className="bg-blue-500/10 text-blue-500">
              <Sparkles className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Developer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{profile?.total_apps || 0}</CardTitle>
              <CardDescription>Total Apps</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{submissions.filter(s => s.submission_status === 'approved').length}</CardTitle>
              <CardDescription>Approved Apps</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{submissions.filter(s => s.submission_status === 'pending').length}</CardTitle>
              <CardDescription>Pending Review</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="submit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submit">
              <Upload className="w-4 h-4 mr-2" />
              Submit App
            </TabsTrigger>
            <TabsTrigger value="submissions">
              <BarChart3 className="w-4 h-4 mr-2" />
              My Submissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Submit New App</CardTitle>
                <CardDescription>
                  Submit your mini-app for review. Verified developers get faster approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">App Name *</label>
                  <Input
                    placeholder="My Awesome App"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    placeholder="Describe what your app does..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">App URL *</label>
                  <Input
                    placeholder="https://yourapp.com or /internal-route"
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use internal routes (starting with /) for Chatr features, or external URLs
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Category *</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Icon (Emoji or URL)</label>
                  <Input
                    placeholder="🚀 or https://yourapp.com/icon.png"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Support Email</label>
                  <Input
                    type="email"
                    placeholder="support@yourapp.com"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                </div>

                <Button onClick={handleSubmitApp} className="w-full">
                  Submit for Review
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No submissions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Submit your first app to get started!</p>
                </CardContent>
              </Card>
            ) : (
              submissions.map((submission, index) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{submission.app_name}</CardTitle>
                          <CardDescription className="mt-1">
                            Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        {getStatusBadge(submission.submission_status)}
                      </div>
                    </CardHeader>
                    {submission.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{submission.description}</p>
                        {submission.rejection_reason && (
                          <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                            <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                            <p className="text-sm text-muted-foreground mt-1">{submission.rejection_reason}</p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DeveloperPortal;
