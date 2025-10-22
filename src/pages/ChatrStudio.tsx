import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Eye, Sparkles, Layout, FileText, Store, Newspaper, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const appTemplates = [
  {
    type: 'resume',
    icon: FileText,
    title: 'Resume Builder',
    description: 'Create professional resumes with templates',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    type: 'portfolio',
    icon: Layout,
    title: 'Portfolio',
    description: 'Showcase your work beautifully',
    color: 'from-purple-500 to-pink-500'
  },
  {
    type: 'store',
    icon: Store,
    title: 'Online Store',
    description: 'Sell products with ease',
    color: 'from-green-500 to-emerald-500'
  },
  {
    type: 'blog',
    icon: Newspaper,
    title: 'Blog',
    description: 'Share your thoughts and stories',
    color: 'from-orange-500 to-red-500'
  },
  {
    type: 'landing',
    icon: Home,
    title: 'Landing Page',
    description: 'Launch your idea quickly',
    color: 'from-indigo-500 to-blue-500'
  },
  {
    type: 'custom',
    icon: Sparkles,
    title: 'Custom App',
    description: 'Build from scratch',
    color: 'from-gray-500 to-slate-600'
  }
];

export default function ChatrStudio() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [myProjects, setMyProjects] = useState<any[]>([]);

  React.useEffect(() => {
    loadMyProjects();
  }, []);

  const loadMyProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('app_builder_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setMyProjects(data || []);
  };

  const handleCreateProject = async () => {
    if (!projectName || !selectedTemplate) {
      toast.error('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('app_builder_projects')
        .insert({
          user_id: user.id,
          project_name: projectName,
          description,
          app_type: selectedTemplate,
          config: {}
        });

      if (error) throw error;

      toast.success('Project created! 🎉');
      setProjectName('');
      setDescription('');
      setSelectedTemplate('');
      loadMyProjects();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (projectId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create mini-app from project
      const project = myProjects.find(p => p.id === projectId);
      if (!project) return;

      const { data: app, error: appError } = await supabase
        .from('mini_apps')
        .insert({
          app_name: project.project_name,
          description: project.description,
          developer_id: user.id,
          category_id: project.app_type,
          icon_url: '/chatr-icon-logo.png',
          app_url: `https://chatr.app/${project.id}`,
          is_free: true
        })
        .select()
        .single();

      if (appError) throw appError;

      // Update project
      const { error: updateError } = await supabase
        .from('app_builder_projects')
        .update({
          is_published: true,
          published_app_id: app.id
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      toast.success('App published to Chatr Hub! 🚀');
      loadMyProjects();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to publish app');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Chatr Studio</h1>
              <p className="text-xs text-muted-foreground">Build and publish mini-apps</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" />
            AI Powered
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* New Project */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New App
            </CardTitle>
            <CardDescription>Choose a template and start building</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Selection */}
            <div className="space-y-3">
              <Label>Choose Template</Label>
              <div className="grid grid-cols-2 gap-3">
                {appTemplates.map((template) => (
                  <div
                    key={template.type}
                    onClick={() => setSelectedTemplate(template.type)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      selectedTemplate === template.type
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-2`}>
                      <template.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm">{template.title}</h3>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Details */}
            {selectedTemplate && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="name">App Name</Label>
                  <Input
                    id="name"
                    placeholder="My Awesome App"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What does your app do?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreateProject} disabled={saving} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  {saving ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Projects */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">My Projects</h2>
          {myProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No projects yet. Create your first app above!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {myProjects.map((project) => (
                <Card key={project.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{project.project_name}</h3>
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{project.app_type}</Badge>
                          {project.is_published && <Badge className="bg-green-500">Published</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!project.is_published && (
                          <Button size="sm" onClick={() => handlePublish(project.id)}>
                            <Eye className="w-4 h-4 mr-1" />
                            Publish
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
