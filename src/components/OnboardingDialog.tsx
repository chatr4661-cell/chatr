import * as React from "react";
import { Camera, Upload, CheckCircle2, Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Contacts } from '@capacitor-community/contacts';
import { z } from 'zod';
import { CountryCodeSelector } from '@/components/CountryCodeSelector';

interface OnboardingDialogProps {
  isOpen: boolean;
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phoneNumber: z.string().trim().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be less than 15 digits"),
});

export const OnboardingDialog = ({ isOpen, userId, onComplete, onSkip }: OnboardingDialogProps) => {
  const [step, setStep] = React.useState(1);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [countryCode, setCountryCode] = React.useState("+91");
  const [statusMessage, setStatusMessage] = React.useState("Hey there! I'm using chatr.chat");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [referralCode, setReferralCode] = React.useState("");
  const [existingEmail, setExistingEmail] = React.useState("");
  const [existingPhone, setExistingPhone] = React.useState("");
  const [referrerId, setReferrerId] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Check for pending referral from invite link
  React.useEffect(() => {
    const pendingCode = localStorage.getItem('pending_invite_code');
    const pendingReferrer = localStorage.getItem('pending_referrer_id');
    
    if (pendingCode) {
      setReferralCode(pendingCode);
    }
    if (pendingReferrer) {
      setReferrerId(pendingReferrer);
    }
  }, []);

  // Load existing profile data AND Google user metadata
  React.useEffect(() => {
    const loadProfile = async () => {
      // First get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, phone_number, full_name, avatar_url, username')
        .eq('id', userId)
        .single();
      
      // Also get auth user metadata (contains Google data)
      const { data: { user } } = await supabase.auth.getUser();
      const googleData = user?.user_metadata;
      
      if (profile || googleData) {
        // Prioritize Google data for name and avatar, fall back to profile
        const googleName = googleData?.full_name || googleData?.name || "";
        const googleAvatar = googleData?.avatar_url || googleData?.picture || "";
        const googleEmail = googleData?.email || "";
        
        // Don't treat @chatr.local emails as "existing"
        const profileEmail = profile?.email && !profile.email.endsWith('@chatr.local') ? profile.email : "";
        const finalEmail = profileEmail || googleEmail;
        
        const phoneWithoutCode = profile?.phone_number?.replace(/^\+\d{1,3}/, '') || "";
        
        setExistingEmail(finalEmail);
        setExistingPhone(profile?.phone_number || "");
        setEmail(finalEmail);
        setPhoneNumber(phoneWithoutCode);
        
        // Auto-fill name from Google if profile doesn't have it
        const finalName = profile?.full_name || googleName || profile?.username || "";
        setFullName(finalName);
        
        // Auto-fill avatar from Google if profile doesn't have it
        const finalAvatar = profile?.avatar_url || googleAvatar || "";
        setAvatarUrl(finalAvatar);
      }
    };
    
    if (userId) loadProfile();
  }, [userId]);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handlePhotoUpload = async (fromCamera: boolean) => {
    try {
      setUploading(true);
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: fromCamera ? CameraSource.Camera : CameraSource.Photos,
      });

      if (image.dataUrl) {
        const base64Data = image.dataUrl.split(',')[1];
        const fileName = `${userId}-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('social-media')
          .upload(`avatars/${fileName}`, 
            Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
            { contentType: 'image/jpeg' }
          );

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('social-media')
          .getPublicUrl(`avatars/${fileName}`);

        setAvatarUrl(data.publicUrl);
        toast({ title: "Photo uploaded successfully!" });
      }
    } catch (error) {
      toast({
        title: "Error uploading photo",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleStep1Next = async () => {
    const fullPhoneNumber = existingPhone || `${countryCode}${phoneNumber}`;
    
    // Validate all required fields
    try {
      profileSchema.parse({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: fullPhoneNumber.replace(/^\+/, ''), // Remove + for length validation
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          email: email.trim(),
          phone_number: fullPhoneNumber,
          status_message: statusMessage,
          avatar_url: avatarUrl || null,
        })
        .eq('id', userId);

      if (error) {
        console.error('[Onboarding] Profile update error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to save profile",
          variant: "destructive",
        });
        return;
      }

      await supabase.from('onboarding_progress').insert({
        user_id: userId,
        step_name: 'basic_profile',
        completed: true,
        completed_at: new Date().toISOString(),
      });

      setStep(2);
    } catch (err) {
      console.error('[Onboarding] Unexpected error:', err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStep2Next = async () => {
    await supabase.from('onboarding_progress').insert({
      user_id: userId,
      step_name: 'additional_details',
      completed: true,
      completed_at: new Date().toISOString(),
    });
    setStep(3);
  };

  const handleContactSync = async () => {
    try {
      setSyncing(true);
      
      const permission = await Contacts.requestPermissions();
      if (permission.contacts !== 'granted') {
        toast({
          title: "Permission denied",
          description: "Contact access is needed to find friends",
          variant: "destructive",
        });
        return;
      }

      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
        },
      });

      const contactList = result.contacts.map(contact => ({
        name: contact.name?.display || 'Unknown',
        phone: contact.phones?.[0]?.number || null,
        email: contact.emails?.[0]?.address || null,
      }));

      const { error } = await supabase.rpc('sync_user_contacts', {
        user_uuid: userId,
        contact_list: contactList,
      });

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({
          contacts_synced: true,
          last_contact_sync: new Date().toISOString(),
        })
        .eq('id', userId);

      await supabase.from('onboarding_progress').insert({
        user_id: userId,
        step_name: 'contact_sync',
        completed: true,
        completed_at: new Date().toISOString(),
      });

      toast({
        title: "Contacts synced!",
        description: `Found ${contactList.length} contacts`,
      });

      onComplete();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {step === 1 && "Set up your profile"}
            {step === 2 && "Tell us more about you"}
            {step === 3 && "Find your friends"}
          </DialogTitle>
        </DialogHeader>

        <Progress value={progress} className="mb-4" />

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePhotoUpload(true)}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePhotoUpload(false)}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Gallery
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={existingEmail || "Enter your email"}
                disabled={!!existingEmail}
                maxLength={255}
              />
              {existingEmail && (
                <p className="text-xs text-muted-foreground">Email from your sign-in method</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="flex gap-2">
                <CountryCodeSelector 
                  value={countryCode} 
                  onChange={setCountryCode}
                  disabled={!!existingPhone}
                />
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder={existingPhone ? existingPhone.replace(countryCode, "") : "Enter phone number"}
                  disabled={!!existingPhone}
                  maxLength={15}
                  className="flex-1"
                />
              </div>
              {existingPhone && (
                <p className="text-xs text-muted-foreground">Phone from your sign-in method</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Message</Label>
              <Textarea
                id="status"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={2}
                maxLength={200}
              />
            </div>

            <Button onClick={handleStep1Next} className="w-full">
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <Gift className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {referralCode ? "Referral Code Applied! 🎉" : "Got a Referral Code?"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {referralCode ? "You'll earn 50 bonus coins!" : "Earn instant 50 bonus coins!"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode">Referral Code {referralCode ? "(Auto-filled from invite)" : "(Optional)"}</Label>
              <Input
                id="referralCode"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g., CHATR-ABC12345)"
                maxLength={25}
                className={referralCode ? "border-green-500 bg-green-50/10" : ""}
              />
              {!referralCode && (
                <p className="text-xs text-muted-foreground">
                  Don't have one? Skip this step - you can add it later!
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleStep2Next} className="flex-1">
                Skip
              </Button>
              <Button 
                onClick={async () => {
                  if (referralCode.trim() || referrerId) {
                    // Process referral with referrer ID for accurate tracking
                    const { error } = await supabase.functions.invoke('process-referral', {
                      body: { 
                        referralCode: referralCode.trim(), 
                        newUserId: userId,
                        referrerId: referrerId // Include direct referrer ID if available
                      }
                    });
                    
                    if (!error) {
                      toast({ title: "Referral code applied! You earned 50 coins!" });
                      // Clear localStorage after successful processing
                      localStorage.removeItem('pending_invite_code');
                      localStorage.removeItem('pending_referrer_id');
                    }
                  }
                  handleStep2Next();
                }} 
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className="h-32 w-32 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="h-16 w-16 text-primary" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Find Friends on Chatr</h3>
              <p className="text-sm text-muted-foreground">
                Sync your contacts to see who's already using Chatr
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onComplete} className="flex-1">
                Skip for now
              </Button>
              <Button 
                onClick={handleContactSync} 
                className="flex-1"
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Sync Contacts"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-2 mt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
