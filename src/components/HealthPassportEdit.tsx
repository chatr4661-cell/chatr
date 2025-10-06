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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HealthPassportEditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passportData: any;
  profileData: any;
  onSuccess: () => void;
}

export const HealthPassportEdit = ({ open, onOpenChange, passportData, profileData, onSuccess }: HealthPassportEditProps) => {
  // Basic Personal Info
  const [fullName, setFullName] = useState(passportData?.full_name || profileData?.username || '');
  const [dateOfBirth, setDateOfBirth] = useState(passportData?.date_of_birth || '');
  const [age, setAge] = useState(profileData?.age || '');
  const [gender, setGender] = useState(profileData?.gender || '');
  const [bloodType, setBloodType] = useState(passportData?.blood_type || '');
  const [homeAddress, setHomeAddress] = useState(passportData?.home_address || '');
  const [currentAddress, setCurrentAddress] = useState(passportData?.current_address || '');

  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>(passportData?.emergency_contacts || []);
  const [newEmergencyContact, setNewEmergencyContact] = useState({ name: '', phone: '', relationship: '' });

  // Medical Info
  const [allergies, setAllergies] = useState<string[]>(passportData?.allergies || []);
  const [conditions, setConditions] = useState<string[]>(passportData?.chronic_conditions || []);
  const [currentMedications, setCurrentMedications] = useState<any[]>(passportData?.current_medications || []);
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', frequency: '', purpose: '' });

  // Past Medical History
  const [surgeries, setSurgeries] = useState<string[]>(passportData?.past_medical_history?.surgeries || []);
  const [hospitalizations, setHospitalizations] = useState<string[]>(passportData?.past_medical_history?.hospitalizations || []);
  const [majorIllnesses, setMajorIllnesses] = useState<string[]>(passportData?.past_medical_history?.major_illnesses || []);
  const [newSurgery, setNewSurgery] = useState('');
  const [newHospitalization, setNewHospitalization] = useState('');
  const [newIllness, setNewIllness] = useState('');

  // Doctor & Care
  const [primaryPhysicianName, setPrimaryPhysicianName] = useState(passportData?.primary_physician_name || '');
  const [primaryPhysicianContact, setPrimaryPhysicianContact] = useState(passportData?.primary_physician_contact || '');
  const [specialists, setSpecialists] = useState<any[]>(passportData?.specialists || []);
  const [preferredHospital, setPreferredHospital] = useState(passportData?.preferred_hospital || '');
  const [newSpecialist, setNewSpecialist] = useState({ name: '', specialty: '', contact: '' });

  // Insurance
  const [insuranceProvider, setInsuranceProvider] = useState(passportData?.insurance_provider || '');
  const [insuranceNumber, setInsuranceNumber] = useState(passportData?.insurance_number || '');

  // Critical Health Info
  const [familyMedicalHistory, setFamilyMedicalHistory] = useState(passportData?.family_medical_history || '');
  const [implantedDevices, setImplantedDevices] = useState(passportData?.implanted_devices || '');
  const [dnrOrder, setDnrOrder] = useState(passportData?.dnr_order || false);
  const [organDonor, setOrganDonor] = useState(passportData?.organ_donor || false);
  const [specialMedicalNeeds, setSpecialMedicalNeeds] = useState(passportData?.special_medical_needs || '');

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
          full_name: fullName,
          date_of_birth: dateOfBirth || null,
          blood_type: bloodType || null,
          home_address: homeAddress || null,
          current_address: currentAddress || null,
          emergency_contacts: emergencyContacts,
          current_medications: currentMedications,
          past_medical_history: {
            surgeries,
            hospitalizations,
            major_illnesses: majorIllnesses
          },
          primary_physician_name: primaryPhysicianName || null,
          primary_physician_contact: primaryPhysicianContact || null,
          specialists: specialists,
          preferred_hospital: preferredHospital || null,
          insurance_provider: insuranceProvider || null,
          insurance_number: insuranceNumber || null,
          allergies,
          chronic_conditions: conditions,
          family_medical_history: familyMedicalHistory || null,
          implanted_devices: implantedDevices || null,
          dnr_order: dnrOrder,
          organ_donor: organDonor,
          special_medical_needs: specialMedicalNeeds || null
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

  const addEmergencyContact = () => {
    if (newEmergencyContact.name && newEmergencyContact.phone) {
      setEmergencyContacts([...emergencyContacts, newEmergencyContact]);
      setNewEmergencyContact({ name: '', phone: '', relationship: '' });
    }
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const addMedication = () => {
    if (newMedication.name && newMedication.dosage) {
      setCurrentMedications([...currentMedications, newMedication]);
      setNewMedication({ name: '', dosage: '', frequency: '', purpose: '' });
    }
  };

  const removeMedication = (index: number) => {
    setCurrentMedications(currentMedications.filter((_, i) => i !== index));
  };

  const addSpecialist = () => {
    if (newSpecialist.name && newSpecialist.specialty) {
      setSpecialists([...specialists, newSpecialist]);
      setNewSpecialist({ name: '', specialty: '', contact: '' });
    }
  };

  const removeSpecialist = (index: number) => {
    setSpecialists(specialists.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Health Passport</DialogTitle>
          <DialogDescription>Comprehensive health and medical information</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
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
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bloodType">Blood Group</Label>
                  <Select value={bloodType} onValueChange={setBloodType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Address Information</h3>
              <div>
                <Label htmlFor="homeAddress">Home Address</Label>
                <Textarea
                  id="homeAddress"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="Enter home address"
                />
              </div>
              <div>
                <Label htmlFor="currentAddress">Current Address (if different)</Label>
                <Textarea
                  id="currentAddress"
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder="Enter current address"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Emergency Contacts</h3>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={newEmergencyContact.name}
                  onChange={(e) => setNewEmergencyContact({ ...newEmergencyContact, name: e.target.value })}
                  placeholder="Name"
                />
                <Input
                  value={newEmergencyContact.phone}
                  onChange={(e) => setNewEmergencyContact({ ...newEmergencyContact, phone: e.target.value })}
                  placeholder="Phone"
                />
                <div className="flex gap-2">
                  <Input
                    value={newEmergencyContact.relationship}
                    onChange={(e) => setNewEmergencyContact({ ...newEmergencyContact, relationship: e.target.value })}
                    placeholder="Relationship"
                  />
                  <Button onClick={addEmergencyContact} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {emergencyContacts.map((contact, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.phone} • {contact.relationship}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeEmergencyContact(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Insurance Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Input
                    id="insuranceProvider"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    placeholder="Provider name"
                  />
                </div>
                <div>
                  <Label htmlFor="insuranceNumber">Policy Number</Label>
                  <Input
                    id="insuranceNumber"
                    value={insuranceNumber}
                    onChange={(e) => setInsuranceNumber(e.target.value)}
                    placeholder="Policy number"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Medical Information Tab */}
          <TabsContent value="medical" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Allergies</h3>
              <div className="flex gap-2">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Add allergy (drugs, food, insect bites)"
                  onKeyPress={(e) => e.key === 'Enter' && newAllergy && (setAllergies([...allergies, newAllergy]), setNewAllergy(''))}
                />
                <Button onClick={() => newAllergy && (setAllergies([...allergies, newAllergy]), setNewAllergy(''))} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allergies.map((allergy, i) => (
                  <Badge key={i} variant="destructive" className="gap-1">
                    {allergy}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setAllergies(allergies.filter((_, idx) => idx !== i))} />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Chronic Conditions</h3>
              <div className="flex gap-2">
                <Input
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="Add condition (e.g., Diabetes, Hypertension)"
                  onKeyPress={(e) => e.key === 'Enter' && newCondition && (setConditions([...conditions, newCondition]), setNewCondition(''))}
                />
                <Button onClick={() => newCondition && (setConditions([...conditions, newCondition]), setNewCondition(''))} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {conditions.map((condition, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {condition}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))} />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Current Medications</h3>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  value={newMedication.name}
                  onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                  placeholder="Medicine"
                />
                <Input
                  value={newMedication.dosage}
                  onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                  placeholder="Dosage"
                />
                <Input
                  value={newMedication.frequency}
                  onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                  placeholder="Frequency"
                />
                <div className="flex gap-2">
                  <Input
                    value={newMedication.purpose}
                    onChange={(e) => setNewMedication({ ...newMedication, purpose: e.target.value })}
                    placeholder="Purpose"
                  />
                  <Button onClick={addMedication} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {currentMedications.map((med, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div>
                      <p className="font-medium">{med.name} - {med.dosage}</p>
                      <p className="text-sm text-muted-foreground">{med.frequency} • {med.purpose}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeMedication(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Doctor & Care Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryPhysician">Primary Physician Name</Label>
                  <Input
                    id="primaryPhysician"
                    value={primaryPhysicianName}
                    onChange={(e) => setPrimaryPhysicianName(e.target.value)}
                    placeholder="Dr. Name"
                  />
                </div>
                <div>
                  <Label htmlFor="physicianContact">Contact Number</Label>
                  <Input
                    id="physicianContact"
                    value={primaryPhysicianContact}
                    onChange={(e) => setPrimaryPhysicianContact(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="preferredHospital">Preferred Hospital/Clinic</Label>
                <Input
                  id="preferredHospital"
                  value={preferredHospital}
                  onChange={(e) => setPreferredHospital(e.target.value)}
                  placeholder="Hospital name"
                />
              </div>

              <div>
                <Label>Specialists</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Input
                    value={newSpecialist.name}
                    onChange={(e) => setNewSpecialist({ ...newSpecialist, name: e.target.value })}
                    placeholder="Name"
                  />
                  <Input
                    value={newSpecialist.specialty}
                    onChange={(e) => setNewSpecialist({ ...newSpecialist, specialty: e.target.value })}
                    placeholder="Specialty"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={newSpecialist.contact}
                      onChange={(e) => setNewSpecialist({ ...newSpecialist, contact: e.target.value })}
                      placeholder="Contact"
                    />
                    <Button onClick={addSpecialist} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  {specialists.map((spec, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium">{spec.name}</p>
                        <p className="text-sm text-muted-foreground">{spec.specialty} • {spec.contact}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeSpecialist(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Medical History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Surgeries</h3>
              <div className="flex gap-2">
                <Input
                  value={newSurgery}
                  onChange={(e) => setNewSurgery(e.target.value)}
                  placeholder="Add surgery with date (e.g., Appendectomy - 2020)"
                  onKeyPress={(e) => e.key === 'Enter' && newSurgery && (setSurgeries([...surgeries, newSurgery]), setNewSurgery(''))}
                />
                <Button onClick={() => newSurgery && (setSurgeries([...surgeries, newSurgery]), setNewSurgery(''))} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {surgeries.map((surgery, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>{surgery}</span>
                    <X className="h-4 w-4 cursor-pointer" onClick={() => setSurgeries(surgeries.filter((_, idx) => idx !== i))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Hospitalizations</h3>
              <div className="flex gap-2">
                <Input
                  value={newHospitalization}
                  onChange={(e) => setNewHospitalization(e.target.value)}
                  placeholder="Add hospitalization with reason and date"
                  onKeyPress={(e) => e.key === 'Enter' && newHospitalization && (setHospitalizations([...hospitalizations, newHospitalization]), setNewHospitalization(''))}
                />
                <Button onClick={() => newHospitalization && (setHospitalizations([...hospitalizations, newHospitalization]), setNewHospitalization(''))} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {hospitalizations.map((hosp, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>{hosp}</span>
                    <X className="h-4 w-4 cursor-pointer" onClick={() => setHospitalizations(hospitalizations.filter((_, idx) => idx !== i))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Major Illnesses</h3>
              <div className="flex gap-2">
                <Input
                  value={newIllness}
                  onChange={(e) => setNewIllness(e.target.value)}
                  placeholder="Add major illness with date"
                  onKeyPress={(e) => e.key === 'Enter' && newIllness && (setMajorIllnesses([...majorIllnesses, newIllness]), setNewIllness(''))}
                />
                <Button onClick={() => newIllness && (setMajorIllnesses([...majorIllnesses, newIllness]), setNewIllness(''))} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {majorIllnesses.map((illness, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>{illness}</span>
                    <X className="h-4 w-4 cursor-pointer" onClick={() => setMajorIllnesses(majorIllnesses.filter((_, idx) => idx !== i))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Family Medical History</h3>
              <Textarea
                value={familyMedicalHistory}
                onChange={(e) => setFamilyMedicalHistory(e.target.value)}
                placeholder="List family history of heart disease, stroke, cancer, genetic conditions, etc."
                rows={4}
              />
            </div>
          </TabsContent>

          {/* Critical Information Tab */}
          <TabsContent value="critical" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Critical Health Information</h3>
              <div>
                <Label htmlFor="implantedDevices">Implanted Devices</Label>
                <Input
                  id="implantedDevices"
                  value={implantedDevices}
                  onChange={(e) => setImplantedDevices(e.target.value)}
                  placeholder="e.g., Pacemaker, Insulin pump"
                />
              </div>

              <div>
                <Label htmlFor="specialNeeds">Special Medical Needs</Label>
                <Textarea
                  id="specialNeeds"
                  value={specialMedicalNeeds}
                  onChange={(e) => setSpecialMedicalNeeds(e.target.value)}
                  placeholder="Oxygen dependency, wheelchair, communication challenges, etc."
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="dnr" className="font-semibold">Do Not Resuscitate (DNR) Order</Label>
                    <p className="text-sm text-muted-foreground">Medical professionals will not attempt resuscitation</p>
                  </div>
                  <Switch
                    id="dnr"
                    checked={dnrOrder}
                    onCheckedChange={setDnrOrder}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="organDonor" className="font-semibold">Organ Donor</Label>
                    <p className="text-sm text-muted-foreground">Willing to donate organs after death</p>
                  </div>
                  <Switch
                    id="organDonor"
                    checked={organDonor}
                    onCheckedChange={setOrganDonor}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};