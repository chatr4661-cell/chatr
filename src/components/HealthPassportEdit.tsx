import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HealthPassportEditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passportData: any;
  profileData: any;
  onSuccess: () => void;
}

export const HealthPassportEdit = ({ open, onOpenChange, passportData, profileData, onSuccess }: HealthPassportEditProps) => {
  const [bloodType, setBloodType] = useState(passportData?.blood_type || '');
  const [insuranceProvider, setInsuranceProvider] = useState(passportData?.insurance_provider || '');
  const [insuranceNumber, setInsuranceNumber] = useState(passportData?.insurance_number || '');
  const [allergies, setAllergies] = useState<string[]>(passportData?.allergies || []);
  const [conditions, setConditions] = useState<string[]>(passportData?.chronic_conditions || []);
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [age, setAge] = useState(profileData?.age || '');
  const [gender, setGender] = useState(profileData?.gender || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update health passport
      const { error: passportError } = await supabase
        .from('health_passport')
        .update({
          blood_type: bloodType || null,
          insurance_provider: insuranceProvider || null,
          insurance_number: insuranceNumber || null,
          allergies,
          chronic_conditions: conditions
        })
        .eq('user_id', user.id);

      if (passportError) throw passportError;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          age: age ? parseInt(age) : null,
          gender: gender || null
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Health passport updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating health passport:', error);
      toast.error('Failed to update health passport');
    } finally {
      setSaving(false);
    }
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Health Passport</DialogTitle>
          <DialogDescription>Update your health information</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter age"
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
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
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Medical Information</h3>
            <div>
              <Label htmlFor="bloodType">Blood Type</Label>
              <Select value={bloodType} onValueChange={setBloodType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Allergies</h3>
            <div className="flex gap-2">
              <Input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="Add allergy (e.g., Peanuts)"
                onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
              />
              <Button onClick={addAllergy} size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy, i) => (
                <Badge key={i} variant="destructive" className="gap-1">
                  {allergy}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeAllergy(i)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Chronic Conditions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Chronic Conditions</h3>
            <div className="flex gap-2">
              <Input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="Add condition (e.g., Diabetes)"
                onKeyPress={(e) => e.key === 'Enter' && addCondition()}
              />
              <Button onClick={addCondition} size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {conditions.map((condition, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {condition}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeCondition(i)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Insurance */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Insurance Information</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  placeholder="e.g., Blue Cross Blue Shield"
                />
              </div>
              <div>
                <Label htmlFor="insuranceNumber">Policy Number</Label>
                <Input
                  id="insuranceNumber"
                  value={insuranceNumber}
                  onChange={(e) => setInsuranceNumber(e.target.value)}
                  placeholder="Enter policy number"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
