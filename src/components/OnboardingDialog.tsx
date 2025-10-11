import * as React from "react";
import { Camera, Upload, CheckCircle2 } from "lucide-react";
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

interface OnboardingDialogProps {
  isOpen: boolean;
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingDialog = ({ isOpen, userId, onComplete, onSkip }: OnboardingDialogProps) => {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [statusMessage, setStatusMessage] = useState("Hey there! I'm using chatr.chat");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

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
    if (!fullName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        status_message: statusMessage,
        avatar_url: avatarUrl || null,
      })
      .eq('id', userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save profile",
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Message</Label>
              <Textarea
                id="status"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onSkip} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleStep1Next} className="flex-1">
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                Great! Your basic profile is complete.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onSkip} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleStep2Next} className="flex-1">
                Next
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
