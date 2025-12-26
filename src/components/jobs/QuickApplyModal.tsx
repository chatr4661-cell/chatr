/**
 * Quick Apply Modal - One-tap apply with profile auto-fill
 * Part of CHATR Action Engine
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Zap, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Building2,
  MapPin
} from 'lucide-react';
import { JobListing } from './JobActionCards';

interface QuickApplyModalProps {
  job: JobListing;
  userProfile?: {
    name?: string;
    phone?: string;
    email?: string;
    skills?: string[];
    experience?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickApplyModal({ 
  job, 
  userProfile, 
  isOpen, 
  onClose, 
  onSuccess 
}: QuickApplyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    experience: '',
    coverNote: ''
  });

  // Auto-fill from profile
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, phone_number, email')
            .eq('id', user.id)
            .single();

          if (profile) {
            setFormData(prev => ({
              ...prev,
              name: profile.username || prev.name,
              phone: profile.phone_number || prev.phone,
              email: profile.email || user.email || prev.email,
            }));
          } else if (user.email) {
            setFormData(prev => ({
              ...prev,
              email: user.email || prev.email,
            }));
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  // Also use passed userProfile
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.name || prev.name,
        phone: userProfile.phone || prev.phone,
        email: userProfile.email || prev.email,
        experience: userProfile.experience || prev.experience,
      }));
    }
  }, [userProfile]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Please fill in your name and phone number');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Save application
      const { error } = await supabase
        .from('job_applications')
        .insert({
          user_id: user?.id || null,
          job_id: job.id,
          status: 'pending',
          cover_letter: formData.coverNote || null,
          application_notes: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            experience: formData.experience,
            applied_via: 'quick_apply'
          })
        });

      if (error) throw error;

      // Update job applications count (optional, may fail if RPC doesn't exist)
      try {
        await supabase.from('chatr_jobs')
          .update({ applications_count: (job.applications_count || 0) + 1 })
          .eq('id', job.id);
      } catch {
        // Ignore if update fails
      }

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <div>
            <p className="font-medium">Application Sent!</p>
            <p className="text-sm text-muted-foreground">
              {job.company_name} will contact you soon
            </p>
          </div>
        </div>
      );

      onSuccess();
    } catch (error: any) {
      console.error('Apply error:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Quick Apply
          </DialogTitle>
        </DialogHeader>

        {/* Job Summary */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <h3 className="font-semibold text-sm">{job.title}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {job.company_name}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.location}
            </span>
          </div>
        </div>

        {isLoadingProfile ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading your profile...</span>
          </div>
        ) : (
          <>
            {/* Auto-fill indicator */}
            {(formData.name || formData.email || formData.phone) && (
              <div className="flex items-center gap-2 text-xs text-green-600 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-filled from your profile</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                />
              </div>

              {/* Experience */}
              <div className="space-y-2">
                <Label htmlFor="experience" className="text-sm flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Experience (Optional)
                </Label>
                <Input
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                  placeholder="e.g., 2 years in sales"
                />
              </div>

              {/* Cover Note */}
              <div className="space-y-2">
                <Label htmlFor="coverNote" className="text-sm">
                  Quick Note (Optional)
                </Label>
                <Textarea
                  id="coverNote"
                  value={formData.coverNote}
                  onChange={(e) => setFormData(prev => ({ ...prev, coverNote: e.target.value }))}
                  placeholder="Why are you a good fit for this role?"
                  rows={3}
                />
              </div>
            </div>

            {/* Skills match */}
            {job.skills && job.skills.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Required Skills:</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-6 flex gap-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Apply Now
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
