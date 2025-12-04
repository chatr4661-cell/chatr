import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
  status: string | null;
  age: number | null;
  gender: string | null;
}

interface ProfileEditDialogProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated: () => void;
}

export const ProfileEditDialog = ({ profile, open, onOpenChange, onProfileUpdated }: ProfileEditDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    status: '',
    phone_number: '',
    age: '',
    gender: '' as string | undefined,
  });

  // Get user session and sync form data when dialog opens
  useEffect(() => {
    const initializeDialog = async () => {
      if (!open) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        
        // If profile exists, use its data
        if (profile) {
          setFormData({
            username: profile.username || '',
            status: profile.status || '',
            phone_number: profile.phone_number || '',
            age: profile.age?.toString() || '',
            gender: profile.gender || undefined, // Use undefined for empty to work with Select
          });
          setAvatarUrl(profile.avatar_url);
        } else {
          // Use session metadata as defaults
          setFormData({
            username: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            status: '',
            phone_number: session.user.phone || '',
            age: '',
            gender: undefined,
          });
          setAvatarUrl(session.user.user_metadata?.avatar_url || null);
        }
      }
    };
    
    initializeDialog();
  }, [open, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error('Not logged in. Please refresh the page.');
      return;
    }

    // Validate phone number is required
    if (!formData.phone_number || formData.phone_number.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      const updateData = {
        username: formData.username || 'User',
        status: formData.status || null,
        phone_number: formData.phone_number || session?.user?.phone || 'unknown',
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        updated_at: new Date().toISOString(),
      };

      let error;
      
      if (existingProfile) {
        // Profile exists - update it
        const result = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);
        error = result.error;
      } else {
        // Profile doesn't exist - insert new one
        const result = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: session?.user?.email || 'unknown@email.com',
            ...updateData,
          });
        error = result.error;
      }

      if (error) throw error;

      toast.success('Profile updated successfully!');
      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      setUploading(true);
      
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('social-media')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(filePath);

      // Check if profile exists for avatar update
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      let updateError;
      
      if (existingProfile) {
        const result = await supabase
          .from('profiles')
          .update({ 
            avatar_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        updateError = result.error;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const result = await supabase
          .from('profiles')
          .insert({ 
            id: userId,
            email: session?.user?.email || 'unknown@email.com',
            phone_number: session?.user?.phone || 'unknown',
            username: session?.user?.user_metadata?.full_name || 'User',
            avatar_url: publicUrl,
          });
        updateError = result.error;
      }

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Avatar updated successfully!');
      onProfileUpdated();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || ''} />
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {(formData.username || 'U').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading || loading}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploading || loading} asChild>
                <span>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Uploading...' : 'Change Avatar'}
                </span>
              </Button>
            </label>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              placeholder="Enter your name"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status Message</Label>
            <Textarea
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              placeholder="Hey there! I am using Chatr"
              rows={2}
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="+91 98765 43210"
              required
            />
            <p className="text-xs text-muted-foreground">Required for account verification</p>
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min="1"
              max="150"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              placeholder="25"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select 
              value={formData.gender || ''} 
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
