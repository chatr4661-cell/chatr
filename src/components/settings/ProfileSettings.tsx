import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Camera, Upload, Trash2, Loader2, User, Phone, Check, Sparkles, Smile } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

interface ProfileData {
  full_name: string;
  username: string;
  email: string;
  phone_number: string;
  status: string;
  avatar_url: string;
}

const STATUS_PRESETS = [
  'Hey there! I am using Chatr',
  'Available',
  'Busy',
  'At work',
  'In a meeting',
  'Battery about to die',
  'Urgent calls only'
];

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
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      const { data } = await supabase
        .from('profiles')
        .select('full_name, username, email, phone_number, status, avatar_url')
        .eq('id', uid)
        .maybeSingle();

      const { data: { session } } = await supabase.auth.getSession();
      const meta = session?.user?.user_metadata || {};

      const rawAvatar = data?.avatar_url || meta.avatar_url;
      const cleanAvatar = (rawAvatar && rawAvatar !== 'null' && rawAvatar !== 'undefined') ? rawAvatar : '';

      setProfile({
        full_name: data?.full_name || meta.full_name || meta.name || '',
        username: data?.username || meta.username || meta.phone_number || '',
        email: data?.email || session?.user?.email || '',
        phone_number: data?.phone_number || meta.phone_number || session?.user?.phone || '',
        status: data?.status || 'Hey there! I am using Chatr',
        avatar_url: cleanAvatar
      });
    } catch (error) {
      console.error('[ProfileSettings] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fast WhatsApp-style avatar upload with client-side compression (< 100ms)
  const processAndUploadAvatar = async (file: File) => {
    if (!userId) {
      toast.error('Please log in to update your photo');
      return;
    }

    // Instant local preview (WhatsApp zero-wait visual feedback)
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploading(true);

    try {
      // Compress image client-side to max 512x512 JPEG (~50-80KB)
      let uploadPayload: File = file;
      try {
        uploadPayload = await compressImage(file, {
          maxSizeMB: 0.15,
          maxWidthOrHeight: 512,
          quality: 0.85
        });
      } catch (compErr) {
        console.warn('[ProfileSettings] Compression fallback:', compErr);
      }

      const fileExt = 'jpg';
      const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;

      // Upload to public 'social-media' storage bucket
      const { error: uploadError } = await supabase.storage
        .from('social-media')
        .upload(filePath, uploadPayload, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(filePath);

      // Save to public.profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          avatar_url: publicUrl,
          full_name: profile.full_name || '',
          username: profile.username || '',
          phone_number: profile.phone_number || '',
          email: profile.email || '',
          status: profile.status || 'Hey there! I am using Chatr',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (updateError) throw updateError;

      // Sync auth user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      }).catch(() => {});

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      setPreviewUrl(null);
      toast.success('Profile photo updated!');

      // Notify global layout
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatar_url: publicUrl } }));
    } catch (error: any) {
      console.error('[ProfileSettings] Avatar upload failed:', error);
      setPreviewUrl(null);
      toast.error(error.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadAvatar(file);
    }
    e.target.value = '';
  };

  // 4. Remove Photo handler
  const handleRemovePhoto = async () => {
    if (!userId) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          avatar_url: '',
          full_name: profile.full_name || '',
          username: profile.username || '',
          phone_number: profile.phone_number || '',
          email: profile.email || '',
          status: profile.status || 'Hey there! I am using Chatr',
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
  const updateProfile = async (overrideData?: Partial<ProfileData>) => {
    if (!userId) {
      toast.error('Session not found. Please log in again.');
      return;
    }

    const payload = {
      ...profile,
      ...(overrideData || {})
    };

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: payload.full_name || '',
          username: payload.username || '',
          avatar_url: payload.avatar_url || '',
          phone_number: payload.phone_number || '',
          email: payload.email || '',
          status: payload.status || 'Hey there! I am using Chatr',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;

      await supabase.auth.updateUser({
        data: {
          full_name: payload.full_name,
          name: payload.full_name,
          username: payload.username
        }
      }).catch(() => {});

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      toast.success('Profile updated successfully');
      window.dispatchEvent(new CustomEvent('profile-updated'));
    } catch (error: any) {
      console.error('[ProfileSettings] Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = previewUrl || (profile.avatar_url && profile.avatar_url !== 'null' ? profile.avatar_url : null);
  const initialLetter = (profile.full_name?.[0] || profile.username?.[0] || '').toUpperCase();

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Hidden file inputs: standard file picker + direct camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* WhatsApp Profile Avatar Section */}
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="relative group mb-4">
          {/* Circular Avatar */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-500/20 shadow-md cursor-pointer relative bg-muted flex items-center justify-center transition-transform group-hover:scale-105"
            title="Click to change profile photo"
          >
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => setProfile(prev => ({ ...prev, avatar_url: '' }))}
              />
            ) : initialLetter ? (
              <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 text-4xl font-semibold">
                {initialLetter}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
                <User className="w-16 h-16 stroke-[1.2]" />
              </div>
            )}

            {/* Hover Camera Overlay (WhatsApp Web Style) */}
            <div className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center transition-opacity rounded-full ${
              uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              {uploading ? (
                <>
                  <Loader2 className="w-7 h-7 text-white animate-spin mb-1" />
                  <span className="text-[11px] text-white font-medium tracking-wide">SAVING...</span>
                </>
              ) : (
                <>
                  <Camera className="w-7 h-7 text-white mb-1" />
                  <span className="text-[10px] text-white font-semibold uppercase tracking-wider text-center px-2">
                    {currentAvatar ? 'Change Photo' : 'Add Photo'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Floating Camera Button (WhatsApp Mobile Style) */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border-2 border-background transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
            title="Upload photo"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons under Avatar */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-8 text-xs font-medium rounded-full px-4 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="h-8 text-xs font-medium rounded-full px-3"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            Camera
          </Button>

          {currentAvatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={handleRemovePhoto}
              className="h-8 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full px-3"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* WhatsApp Profile Details Card */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
        {/* Your Name (WhatsApp Style) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Your Name
            </Label>
            {savedSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          <Input
            id="full_name"
            placeholder="Enter your name"
            value={profile.full_name}
            onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && updateProfile()}
            className="text-base py-2.5 bg-background"
          />
          <p className="text-xs text-muted-foreground">
            This is not your username or pin. This name will be visible to your Chatr contacts.
          </p>
        </div>

        {/* About / Status (WhatsApp Style) */}
        <div className="space-y-2">
          <Label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5" /> About
          </Label>
          <Input
            id="status"
            placeholder="Hey there! I am using Chatr"
            value={profile.status}
            onChange={(e) => setProfile(prev => ({ ...prev, status: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && updateProfile()}
            className="text-sm bg-background"
          />

          {/* Quick preset chips */}
          <div className="pt-1">
            <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">Quick Select:</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_PRESETS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setProfile(prev => ({ ...prev, status: st }));
                    updateProfile({ status: st });
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    profile.status === st
                      ? 'bg-emerald-600 text-white border-emerald-600 font-medium shadow-sm'
                      : 'bg-muted/50 hover:bg-muted text-foreground border-border/80'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Username / Handle */}
        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Username
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">@</span>
            <Input
              id="username"
              placeholder="username"
              value={profile.username.replace(/^@/, '')}
              onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value.replace(/^@/, '') }))}
              onKeyDown={(e) => e.key === 'Enter' && updateProfile()}
              className="pl-7 text-sm bg-background"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Unique handle for mentions, direct search, and profile links.
          </p>
        </div>

        {/* Phone Number (Verified & Read-only) */}
        {profile.phone_number && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> Phone Number
            </Label>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <span className="font-mono text-sm font-medium text-foreground">
                {profile.phone_number}
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> Registered
              </span>
            </div>
          </div>
        )}

        {/* Save Changes Button */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={() => updateProfile()}
            disabled={saving || loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl shadow-md transition-all active:scale-[0.99]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Profile...
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
