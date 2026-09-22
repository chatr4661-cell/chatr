import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, Upload, Trash2, Loader2 } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

interface ProfileData {
  full_name: string;
  username: string;
  email: string;
  phone_number: string;
  status: string;
  avatar_url: string;
}

export const ProfileSettings = ({ userId: initialUserId }: { userId?: string }) => {
  const [userId, setUserId] = useState<string | undefined>(initialUserId);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    username: '',
    email: '',
    phone_number: '',
    status: 'Hey there! I am using Chatr',
    avatar_url: ''
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Resolve user ID if not provided via props
  useEffect(() => {
    if (initialUserId) {
      setUserId(initialUserId);
      return;
    }

    const resolveUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) setUserId(user.id);
        }
      } catch (err) {
        console.error('[ProfileSettings] Error resolving user:', err);
      }
    };

    resolveUser();
  }, [initialUserId]);

  // 2. Load profile data once userId is known
  useEffect(() => {
    if (userId) {
      loadProfile(userId);
    }
  }, [userId]);

  const loadProfile = async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, email, phone_number, status, avatar_url')
        .eq('id', uid)
        .maybeSingle();

      // Also get session user metadata as fallback
      const { data: { session } } = await supabase.auth.getSession();
      const meta = session?.user?.user_metadata || {};

      if (data) {
        setProfile({
          full_name: data.full_name || meta.full_name || meta.name || '',
          username: data.username || meta.username || '',
          email: data.email || session?.user?.email || '',
          phone_number: data.phone_number || meta.phone_number || session?.user?.phone || '',
          status: data.status || 'Hey there! I am using Chatr',
          avatar_url: data.avatar_url || meta.avatar_url || ''
        });
      } else {
        // Profile row hasn't been created yet, use auth metadata
        setProfile({
          full_name: meta.full_name || meta.name || '',
          username: meta.username || meta.phone_number || '',
          email: session?.user?.email || '',
          phone_number: meta.phone_number || session?.user?.phone || '',
          status: 'Hey there! I am using Chatr',
          avatar_url: meta.avatar_url || ''
        });
      }
    } catch (error) {
      console.error('[ProfileSettings] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fast WhatsApp-style avatar upload: Instant optimistic preview + fast client compression + upload
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Reset input value so re-selecting the same file triggers onChange
    e.target.value = '';

    // Instant local preview in 0ms (WhatsApp feel)
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploading(true);

    try {
      // Fast client-side resize & compression (< 50ms)
      let uploadPayload: File = file;
      try {
        uploadPayload = await compressImage(file, {
          maxSizeMB: 0.15, // ~150KB max
          maxWidthOrHeight: 512, // perfect WhatsApp avatar resolution
          quality: 0.85
        });
      } catch (compErr) {
        console.warn('[ProfileSettings] Image compression fallback to original:', compErr);
      }

      // Upload to public 'social-media' bucket
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('social-media')
        .upload(filePath, uploadPayload, {
          contentType: uploadPayload.type || 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(filePath);

      // Save to public.profiles via upsert
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (updateError) throw updateError;

      // Also update auth user metadata so session stays in sync everywhere
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      }).catch(err => console.warn('[ProfileSettings] Metadata update warning:', err));

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      setPreviewUrl(null);
      toast.success('Profile photo updated!');

      // Notify other components (navbars, sidebars)
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatar_url: publicUrl } }));
    } catch (error: any) {
      console.error('[ProfileSettings] Error uploading avatar:', error);
      setPreviewUrl(null);
      toast.error(error.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // 4. Remove Photo handler
  const handleRemovePhoto = async () => {
    if (!userId || (!profile.avatar_url && !previewUrl)) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          avatar_url: '',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;

      await supabase.auth.updateUser({
        data: { avatar_url: '' }
      }).catch(() => {});

      setProfile(prev => ({ ...prev, avatar_url: '' }));
      setPreviewUrl(null);
      toast.success('Profile photo removed');

      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatar_url: '' } }));
    } catch (error: any) {
      toast.error('Failed to remove photo');
    } finally {
      setUploading(false);
    }
  };

  // 5. Save Changes handler
  const updateProfile = async () => {
    if (!userId) {
      toast.error('Session not found. Please log in again.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: profile.full_name,
          username: profile.username,
          status: profile.status,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;

      await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          name: profile.full_name,
          username: profile.username
        }
      }).catch(() => {});

      toast.success('Profile updated successfully');
      window.dispatchEvent(new CustomEvent('profile-updated'));
    } catch (error) {
      console.error('[ProfileSettings] Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = previewUrl || profile.avatar_url;
  const initialLetter = (profile.full_name?.[0] || profile.username?.[0] || 'U').toUpperCase();

  return (
    <div className="space-y-6">
      {/* Hidden file input for native / web file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarSelect}
      />

      {/* WhatsApp-Style Avatar Card */}
      <div className="flex items-center gap-6 p-4 rounded-xl bg-card border border-border shadow-sm">
        <div 
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="relative group cursor-pointer rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          title="Click to change profile photo"
        >
          <Avatar className="w-24 h-24 border-2 border-primary/20 transition-transform group-hover:scale-105">
            {displayAvatar ? (
              <AvatarImage src={displayAvatar} alt="Profile" className="object-cover" />
            ) : null}
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {initialLetter}
            </AvatarFallback>
          </Avatar>

          {/* Hover / Upload overlay */}
          <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center transition-opacity rounded-full ${
            uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            {uploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <>
                <Camera className="w-6 h-6 text-white" />
                <span className="text-[10px] text-white font-medium mt-1">CHANGE</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <h3 className="font-semibold text-foreground text-base">
              {profile.full_name || profile.username || 'Your Profile'}
            </h3>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP • Auto-compressed for ultra-fast load
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs font-medium"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 mr-1.5" />
              )}
              {uploading ? 'Uploading...' : 'Change Photo'}
            </Button>

            {displayAvatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={handleRemovePhoto}
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
          <Input
            id="full_name"
            placeholder="Enter your name (e.g. Chatr User)"
            value={profile.full_name}
            onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="username" className="text-sm font-medium">Username</Label>
          <Input
            id="username"
            placeholder="Enter unique username"
            value={profile.username}
            onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="status" className="text-sm font-medium">About / Status</Label>
          <Input
            id="status"
            placeholder="Hey there! I am using Chatr"
            value={profile.status}
            onChange={(e) => setProfile(prev => ({ ...prev, status: e.target.value }))}
            className="mt-1"
          />
        </div>

        {profile.phone_number && (
          <div>
            <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
            <Input
              id="phone"
              value={profile.phone_number}
              disabled
              className="mt-1 opacity-70 bg-muted cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            id="email"
            value={profile.email.endsWith('@chatr.local') ? '' : profile.email}
            placeholder={profile.email.endsWith('@chatr.local') ? 'Phone account (no email linked)' : ''}
            disabled
            className="mt-1 opacity-70 bg-muted cursor-not-allowed"
          />
        </div>

        <Button 
          onClick={updateProfile} 
          disabled={saving || loading} 
          className="w-full mt-2 font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
};
