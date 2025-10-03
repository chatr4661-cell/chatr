import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    medicalHistory: '',
    lifestyle: '',
    healthGoals: '',
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          age: parseInt(formData.age) || null,
          gender: formData.gender || null,
          medical_history: formData.medicalHistory ? JSON.parse(formData.medicalHistory) : [],
          lifestyle: formData.lifestyle ? JSON.parse(formData.lifestyle) : {},
          health_goals: formData.healthGoals ? formData.healthGoals.split(',').map(g => g.trim()) : [],
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile completed!',
        description: 'Welcome to your health journey.',
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) throw error;

      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>Help us personalize your health experience</CardDescription>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Enter your age"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="medical-history">Medical History (comma-separated conditions)</Label>
                <Textarea
                  id="medical-history"
                  placeholder='e.g., ["diabetes", "hypertension"]'
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground mt-1">Format as JSON array: ["condition1", "condition2"]</p>
              </div>
              <div>
                <Label htmlFor="lifestyle">Lifestyle Information</Label>
                <Textarea
                  id="lifestyle"
                  placeholder='e.g., {"exercise": "moderate", "diet": "balanced", "smoking": "no"}'
                  value={formData.lifestyle}
                  onChange={(e) => setFormData({ ...formData, lifestyle: e.target.value })}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground mt-1">Format as JSON object with key-value pairs</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="health-goals">Health Goals (comma-separated)</Label>
                <Textarea
                  id="health-goals"
                  placeholder="e.g., weight loss, better sleep, stress management"
                  value={formData.healthGoals}
                  onChange={(e) => setFormData({ ...formData, healthGoals: e.target.value })}
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground mt-1">Enter your health goals separated by commas</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip for now
            </Button>

            <div className="flex gap-2">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              
              {step < 3 ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={loading}>
                  Complete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}