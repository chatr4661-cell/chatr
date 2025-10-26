import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useOnboarding = (userId: string | undefined) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setIsOpen(false);
      return;
    }

    const checkOnboardingStatus = async () => {
      console.log('[ONBOARDING HOOK] Checking for userId:', userId);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();

      console.log('[ONBOARDING HOOK] Profile check:', { profile, error });

      // Show onboarding for new users who haven't completed it OR if profile doesn't exist
      if (!profile || (profile && !profile.onboarding_completed)) {
        console.log('[ONBOARDING HOOK] Opening onboarding dialog');
        setIsOpen(true);
      } else {
        console.log('[ONBOARDING HOOK] Profile complete, not showing dialog');
        setIsOpen(false);
      }
    };

    checkOnboardingStatus();
  }, [userId]);

  const completeStep = async (stepName: string) => {
    if (!userId) return;

    await supabase.from('onboarding_progress').upsert({
      user_id: userId,
      step_name: stepName,
      completed: true,
      completed_at: new Date().toISOString(),
    });
  };

  const completeOnboarding = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        profile_completed_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to complete onboarding",
        variant: "destructive",
      });
      return false;
    }

    setIsOpen(false);
    return true;
  };

  const skipOnboarding = async () => {
    if (!userId) return;

    await completeOnboarding();
    toast({
      title: "Skipped onboarding",
      description: "You can complete your profile anytime from settings",
    });
  };

  return {
    isOpen,
    currentStep,
    setCurrentStep,
    completeStep,
    completeOnboarding,
    skipOnboarding,
    setIsOpen,
  };
};
