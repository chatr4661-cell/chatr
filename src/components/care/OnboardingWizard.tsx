import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Pill, Users, Bell, ChevronRight, ChevronLeft, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

interface OnboardingData {
  conditions: string[];
  hasFamily: boolean;
  wantsReminders: boolean;
}

const conditions = [
  { id: 'diabetes', name: 'Diabetes', emoji: '🩸' },
  { id: 'hypertension', name: 'High BP', emoji: '❤️' },
  { id: 'thyroid', name: 'Thyroid', emoji: '🦋' },
  { id: 'cholesterol', name: 'Cholesterol', emoji: '🫀' },
  { id: 'heart', name: 'Heart Disease', emoji: '💗' },
  { id: 'asthma', name: 'Asthma', emoji: '🌬️' },
];

export const OnboardingWizard = ({ onComplete, onSkip }: OnboardingWizardProps) => {
  const [step, setStep] = useState(0);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [hasFamily, setHasFamily] = useState(false);
  const [wantsReminders, setWantsReminders] = useState(true);

  const steps = [
    {
      title: 'What conditions do you manage?',
      subtitle: 'Select all that apply',
      icon: Heart,
      gradient: 'from-rose-500 to-pink-500'
    },
    {
      title: 'Managing medicines for family?',
      subtitle: 'We can help you care for loved ones',
      icon: Users,
      gradient: 'from-blue-500 to-indigo-500'
    },
    {
      title: 'Never miss a dose',
      subtitle: 'Enable smart reminders',
      icon: Bell,
      gradient: 'from-amber-500 to-orange-500'
    }
  ];

  const toggleCondition = (id: string) => {
    setSelectedConditions(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete({
        conditions: selectedConditions,
        hasFamily,
        wantsReminders
      });
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Skip Button */}
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          Skip
        </Button>
      </div>

      <div className="flex flex-col h-full p-6 pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            {/* Header */}
            <motion.div 
              className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${currentStep.gradient} flex items-center justify-center mb-6`}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <StepIcon className="h-10 w-10 text-white" />
            </motion.div>

            <h1 className="text-2xl font-bold mb-2">{currentStep.title}</h1>
            <p className="text-muted-foreground mb-8">{currentStep.subtitle}</p>

            {/* Step Content */}
            {step === 0 && (
              <div className="grid grid-cols-2 gap-3">
                {conditions.map((condition, idx) => (
                  <motion.div
                    key={condition.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedConditions.includes(condition.id)
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => toggleCondition(condition.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <span className="text-2xl">{condition.emoji}</span>
                        <span className="font-medium text-sm">{condition.name}</span>
                        {selectedConditions.includes(condition.id) && (
                          <Check className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                {[
                  { value: false, title: 'Just for myself', desc: 'Manage my own medicines' },
                  { value: true, title: 'For my family too', desc: 'Care for parents, spouse, or children' }
                ].map((option) => (
                  <motion.div
                    key={option.title}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all ${
                        hasFamily === option.value
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setHasFamily(option.value)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{option.title}</p>
                          <p className="text-sm text-muted-foreground">{option.desc}</p>
                        </div>
                        {hasFamily === option.value && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                
                {hasFamily && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        <p className="text-sm text-blue-800">
                          Great! We'll recommend the Family Plan with caregiver alerts
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <Card 
                  className={`cursor-pointer transition-all ${
                    wantsReminders ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setWantsReminders(!wantsReminders)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                          <Bell className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">Smart Reminders</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Get timely notifications for each medicine
                          </p>
                          <div className="flex flex-wrap gap-1 mt-3">
                            <Badge variant="secondary" className="text-xs">Push</Badge>
                            <Badge variant="secondary" className="text-xs">WhatsApp</Badge>
                            <Badge variant="secondary" className="text-xs">Voice</Badge>
                          </div>
                        </div>
                      </div>
                      <Checkbox checked={wantsReminders} />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { emoji: '🌅', time: '8:00 AM', label: 'Morning' },
                    { emoji: '☀️', time: '2:00 PM', label: 'Afternoon' },
                    { emoji: '🌙', time: '9:00 PM', label: 'Night' }
                  ].map((slot, idx) => (
                    <motion.div
                      key={slot.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Card className="bg-muted/50">
                        <CardContent className="p-3 text-center">
                          <span className="text-2xl">{slot.emoji}</span>
                          <p className="text-xs font-medium mt-1">{slot.label}</p>
                          <p className="text-[10px] text-muted-foreground">{slot.time}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 pt-6">
          {step > 0 && (
            <Button variant="outline" onClick={prevStep} className="h-12 rounded-xl">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <Button 
            className="flex-1 h-12 rounded-xl text-base font-semibold"
            onClick={nextStep}
          >
            {step === steps.length - 1 ? (
              <>
                Get Started
                <Sparkles className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
