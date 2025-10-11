import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useOnboarding = (userId: string | undefined) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const checkOnboardingStatus = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();

      if (profile && !profile.onboarding_completed) {
        setIsOpen(true);
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
