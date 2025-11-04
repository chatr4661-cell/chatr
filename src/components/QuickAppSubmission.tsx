import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Zap } from 'lucide-react';

interface QuickAppSubmissionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  'productivity', 'entertainment', 'health', 'finance', 
  'social', 'utilities', 'games', 'education', 'business', 'tools'
];

export const QuickAppSubmission = ({ open, onOpenChange }: QuickAppSubmissionProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [url, setUrl] = useState('');
  const [appName, setAppName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  const handleSubmit = async () => {
    if (step === 1) {
      // Validate URL
      try {
        new URL(url);
        setStep(2);
      } catch {
        toast.error('Please enter a valid URL');
      }
      return;
    }

    // Step 2: Submit to admin for approval
    if (!appName || !description || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to submit an app');
        return;
      }

      // Create developer profile if not exists
      const { data: devProfile } = await supabase
        .from('developer_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!devProfile) {
        await supabase
          .from('developer_profiles')
          .insert({
            user_id: user.id,
            developer_name: user.email?.split('@')[0] || 'Developer',
            is_verified: false,
            portal_enabled: true
          });
      }

      // Get category ID - create if doesn't exist
      let categoryId = '';
      const { data: existingCategory } = await supabase
        .from('app_categories')
        .select('id')
        .eq('name', category)
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const { data: newCategory } = await supabase
          .from('app_categories')
          .insert({
            name: category,
            description: `${category} apps`,
            icon: '📱',
            display_order: 999
          })
          .select('id')
          .single();
        
        categoryId = newCategory?.id || '';
      }

      // Submit app for approval
      const { error } = await supabase
        .from('app_submissions')
        .insert({
          developer_id: user.id,
          app_name: appName,
          app_url: url,
          description: description,
          category_id: categoryId,
          icon_url: iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(appName)}&background=random`,
          submission_status: 'pending'
        });

      if (error) throw error;

      toast.success('🎉 App submitted! We\'ll review it within 24 hours');
      
      // Reset form
      setUrl('');
      setAppName('');
      setDescription('');
      setCategory('');
      setIconUrl('');
      setStep(1);
      onOpenChange(false);

    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit app. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 1 ? 'Add Your App URL' : 'Customize Your App'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'Submit any web app or service. We\'ll review and list it in our marketplace.'
              : 'Add details to help users discover your app. Admin approval required.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 1 ? (
            <div className="space-y-2">
              <Label htmlFor="url">App URL *</Label>
              <Input
                id="url"
                placeholder="https://your-app.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Your app will open in an iframe inside Chatr.Chat
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="appName">App Name *</Label>
                <Input
                  id="appName"
                  placeholder="My Awesome App"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what your app does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/200 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="iconUrl">Icon URL (Optional)</Label>
                <Input
                  id="iconUrl"
                  placeholder="https://your-icon.png"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for auto-generated icon
                </p>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Revenue Share</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Chatr.Chat earns 7.5% from in-app payments. You keep 92.5%!
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={loading || (step === 1 && !url)}
            className="flex-1"
          >
            {loading ? 'Submitting...' : step === 1 ? 'Next →' : 'Submit for Approval'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
