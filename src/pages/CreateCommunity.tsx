import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Upload, Users } from 'lucide-react';
import { toast } from 'sonner';

const CreateCommunity = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    isPublic: true,
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let iconUrl = '';

      // Upload icon if provided
      if (iconFile) {
        const fileExt = iconFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('social-media')
          .upload(fileName, iconFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('social-media')
          .getPublicUrl(fileName);

        iconUrl = publicUrl;
      }

      // Create community (conversation with is_community = true)
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          created_by: user.id,
          is_group: true,
          is_community: true,
          group_name: formData.name,
          community_description: formData.description,
          category: formData.category,
          is_public: formData.isPublic,
          group_icon_url: iconUrl,
          member_count: 1,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add creator as admin
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'admin',
        });

      if (participantError) throw participantError;

      toast.success('Community created successfully!');
      navigate('/communities');
    } catch (error: any) {
      console.error('Error creating community:', error);
      toast.error('Failed to create community: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/communities')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Create Community</h1>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Community Icon */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {iconPreview ? (
                  <img src={iconPreview} alt="Community icon" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-12 h-12 text-primary" />
                )}
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleIconChange}
                  disabled={loading}
                />
                <Button type="button" variant="outline" size="sm" disabled={loading} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Icon
                  </span>
                </Button>
              </label>
            </div>

            {/* Community Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Community Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter community name"
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this community about?"
                rows={4}
                required
                disabled={loading}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
                disabled={loading}
              >
                <option value="general">General</option>
                <option value="health">Health & Wellness</option>
                <option value="fitness">Fitness</option>
                <option value="nutrition">Nutrition</option>
                <option value="mental_health">Mental Health</option>
                <option value="chronic_illness">Chronic Illness</option>
                <option value="support">Support Group</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Privacy */}
            <div className="space-y-2">
              <Label>Privacy</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.isPublic}
                    onChange={() => setFormData({ ...formData, isPublic: true })}
                    disabled={loading}
                  />
                  <span className="text-sm">Public - Anyone can join</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.isPublic}
                    onChange={() => setFormData({ ...formData, isPublic: false })}
                    disabled={loading}
                  />
                  <span className="text-sm">Private - Invite only</span>
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/communities')}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Community'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateCommunity;
