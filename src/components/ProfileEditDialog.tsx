import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2, Check, Save } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    status: '',
    phone_number: '',
    age: '',
    gender: '',
  });
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);

  // Get user session and sync form data when dialog opens
  useEffect(() => {
    const initializeDialog = async () => {
      if (!open) {
        initialLoadRef.current = true;
        return;
      }
      
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
            gender: profile.gender || '',
          });
          setAvatarUrl(profile.avatar_url);
        } else {
          // Use session metadata as defaults
          setFormData({
            username: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            status: '',
            phone_number: session.user.phone || '',
            age: '',
            gender: '',
          });
          setAvatarUrl(session.user.user_metadata?.avatar_url || null);
        }
        
        // Mark initial load complete after a short delay
        setTimeout(() => {
          initialLoadRef.current = false;
        }, 500);
      }
    };
    
    initializeDialog();
  }, [open, profile]);

  // Auto-save function
  const saveProfile = useCallback(async (data: typeof formData) => {
    if (!userId || initialLoadRef.current) return;
    
    // Validate phone number
    const phoneDigits = data.phone_number?.replace(/\D/g, '') || '';
    if (phoneDigits.length < 10) {
      return; // Don't save if phone is invalid, but don't show error during typing
    }
    
    setSaving(true);
    setSaved(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return;
      }
      
      const updateData = {
        username: data.username?.trim() || 'User',
        status: data.status?.trim() || null,
        phone_number: data.phone_number?.trim() || session.user.phone || 'unknown',
        age: data.age ? parseInt(data.age) : null,
        gender: data.gender || null,
        updated_at: new Date().toISOString(),
      };

      // Use upsert for simplicity
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: session.user.email || 'unknown@email.com',
          ...updateData,
        }, { onConflict: 'id' });

      if (error) {
        console.error('Auto-save error:', error);
        toast.error('Failed to save changes');
      } else {
        setSaved(true);
        onProfileUpdated();
        // Reset saved indicator after 2 seconds
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error: any) {
      console.error('Error auto-saving profile:', error);
    } finally {
      setSaving(false);
    }
  }, [userId, onProfileUpdated]);

  // Debounced auto-save on form change
  useEffect(() => {
    if (initialLoadRef.current || !userId) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (800ms debounce)
    saveTimeoutRef.current = setTimeout(() => {
      saveProfile(formData);
    }, 800);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, userId, saveProfile]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

      const { data: { session } } = await supabase.auth.getSession();
      
      // Use upsert for avatar update
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: session?.user?.email || 'unknown@email.com',
          phone_number: formData.phone_number || session?.user?.phone || 'unknown',
          username: formData.username || session?.user?.user_metadata?.full_name || 'User',
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Avatar updated!');
      onProfileUpdated();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const phoneDigits = formData.phone_number?.replace(/\D/g, '') || '';
  const isPhoneValid = phoneDigits.length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Profile</DialogTitle>
            <div className="flex items-center gap-2 text-xs mr-4">
              {saving && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              )}
              {saved && !saving && (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">Saved</span>
                </>
              )}
              {!saving && !saved && !isPhoneValid && (
                <span className="text-destructive">Fix phone to save</span>
              )}
              {!saving && !saved && isPhoneValid && (
                <>
                  <Save className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Auto-save</span>
                </>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
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
                disabled={uploading}
              />
              <div className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-accent cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Uploading...' : 'Change Avatar'}
              </div>
            </label>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleFieldChange('username', e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status Message</Label>
            <Textarea
              id="status"
              value={formData.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
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
              onChange={(e) => handleFieldChange('phone_number', e.target.value)}
              placeholder="+91 98765 43210"
            />
            <p className="text-xs text-muted-foreground">Required (min 10 digits)</p>
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
              onChange={(e) => handleFieldChange('age', e.target.value)}
              placeholder="25"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select 
              value={formData.gender} 
              onValueChange={(value) => handleFieldChange('gender', value)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
