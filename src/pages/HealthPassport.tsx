import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QRCodeSVG } from 'qrcode.react';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  QrCode,
  FileText,
  Pill,
  Activity,
  Syringe,
  Calendar,
  Download,
  Share2,
  Heart,
  AlertCircle,
  Shield,
  User,
  Edit,
  Plus,
  Target,
  TrendingUp,
  Droplet,
  Moon,
  Footprints
} from 'lucide-react';
import { toast } from 'sonner';
import { HealthPassportEdit } from '@/components/HealthPassportEdit';
import { VaccinationDialog } from '@/components/VaccinationDialog';
import { HealthGoalsDialog } from '@/components/HealthGoalsDialog';

interface HealthPassportData {
  id: string;
  passport_number: string;
  photo_url?: string;
  blood_type?: string;
  allergies: any;
  chronic_conditions: any;
  insurance_provider?: string;
  insurance_number?: string;
  qr_code_data?: string;
  full_name?: string;
  date_of_birth?: string;
  home_address?: string;
  current_address?: string;
  emergency_contacts?: any[];
  current_medications?: any[];
  past_medical_history?: any;
  primary_physician_name?: string;
  primary_physician_contact?: string;
  specialists?: any[];
  preferred_hospital?: string;
  family_medical_history?: string;
  implanted_devices?: string;
  dnr_order?: boolean;
  organ_donor?: boolean;
  special_medical_needs?: string;
}

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  prescribed_date: string;
  status: string;
  provider_id?: string;
}

interface VaccinationRecord {
  id: string;
  vaccine_name: string;
  dose_number: number;
  date_administered: string;
  next_dose_date?: string;
  administered_by?: string;
  certificate_url?: string;
}

const HealthPassport = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [passport, setPassport] = useState<HealthPassportData | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [labReports, setLabReports] = useState<any[]>([]);
  const [wellnessData, setWellnessData] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [healthGoals, setHealthGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [vaccinationDialogOpen, setVaccinationDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      // Load or create health passport
      let { data: passportData, error: passportError } = await supabase
        .from('health_passport')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!passportData && !passportError) {
        // Create passport if doesn't exist
        const { data: newPassport } = await supabase
          .from('health_passport')
          .insert({
            user_id: user.id,
            qr_code_data: user.id
          })
          .select()
          .single();
        passportData = newPassport;
      }
      setPassport(passportData as any);

      // Load prescriptions
      const { data: prescData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('prescribed_date', { ascending: false });
      setPrescriptions(prescData || []);

      // Load vaccinations
      const { data: vaccData } = await supabase
        .from('vaccination_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date_administered', { ascending: false });
      setVaccinations(vaccData || []);

      // Load lab reports
      const { data: labData } = await supabase
        .from('lab_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false })
        .limit(5);
      setLabReports(labData || []);

      // Load wellness tracking
      const { data: wellnessData } = await supabase
        .from('wellness_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(7);
      setWellnessData(wellnessData || []);

      // Load appointments
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*, service_providers(*)')
        .eq('patient_id', user.id)
        .order('appointment_date', { ascending: false })
        .limit(10);
      setAppointments(apptData || []);

      // Load health goals
      const { data: goalsData } = await supabase
        .from('health_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      setHealthGoals(goalsData || []);

    } catch (error) {
      console.error('Error loading health data:', error);
      toast.error('Failed to load health passport data');
    } finally {
      setLoading(false);
    }
  };

  const exportPassport = () => {
    toast.info('PDF export coming soon!');
  };

  const sharePassport = () => {
    toast.info('Secure sharing coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Health Passport</h1>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditDialogOpen(true)}
                className="text-white hover:bg-white/20"
                title="Edit Health Passport"
              >
                <Edit className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowQR(!showQR)}
                className="text-white hover:bg-white/20"
              >
                <QrCode className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={sharePassport}
                className="text-white hover:bg-white/20"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={exportPassport}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Passport Card */}
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24 border-4 border-white">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-white text-2xl">
                    {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-white">
                  <h2 className="text-2xl font-bold mb-1">{profile?.username}</h2>
                  <p className="text-white/80 mb-3">Passport: {passport?.passport_number}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-white/60">Blood Type</p>
                      <p className="font-semibold">{passport?.blood_type || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Age</p>
                      <p className="font-semibold">{profile?.age || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                {showQR && passport && (
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG
                      value={passport.qr_code_data || passport.id}
                      size={120}
                      level="H"
                    />
                  </div>
                )}
              </div>

              {/* Key Health Info */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-white/80 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Allergies</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {passport?.allergies && passport.allergies.length > 0 ? (
                      passport.allergies.map((allergy: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {allergy}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-white/60">None</span>
                    )}
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-white/80 mb-2">
                    <Heart className="h-4 w-4" />
                    <span className="text-xs font-medium">Conditions</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {passport?.chronic_conditions && passport.chronic_conditions.length > 0 ? (
                      passport.chronic_conditions.map((condition: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {condition}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-white/60">None</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              <Pill className="h-4 w-4 mr-2" />
              Meds
            </TabsTrigger>
            <TabsTrigger value="vaccines">
              <Syringe className="h-4 w-4 mr-2" />
              Vaccines
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="wellness">
              <Activity className="h-4 w-4 mr-2" />
              Wellness
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{passport?.full_name || profile?.username || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{passport?.date_of_birth || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{profile?.gender || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blood Group</p>
                  <p className="font-medium">{passport?.blood_type || 'Not set'}</p>
                </div>
                {passport?.home_address && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Home Address</p>
                    <p className="font-medium">{passport.home_address}</p>
                  </div>
                )}
                {passport?.current_address && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Current Address</p>
                    <p className="font-medium">{passport.current_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            {passport?.emergency_contacts && passport.emergency_contacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Emergency Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {passport.emergency_contacts.map((contact: any, i: number) => (
                    <div key={i} className="p-3 bg-muted rounded-lg">
                      <p className="font-semibold">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      <p className="text-sm text-muted-foreground capitalize">{contact.relationship}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Current Medications */}
            {passport?.current_medications && passport.current_medications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Current Medications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {passport.current_medications.map((med: any, i: number) => (
                    <div key={i} className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{med.name}</p>
                          <p className="text-sm text-muted-foreground">{med.dosage} • {med.frequency}</p>
                        </div>
                        <Badge variant="outline">{med.purpose}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Medical History */}
            {passport?.past_medical_history && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Past Medical History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {passport.past_medical_history.surgeries && passport.past_medical_history.surgeries.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Surgeries</p>
                      <div className="space-y-1">
                        {passport.past_medical_history.surgeries.map((surgery: string, i: number) => (
                          <p key={i} className="text-sm text-muted-foreground">• {surgery}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {passport.past_medical_history.hospitalizations && passport.past_medical_history.hospitalizations.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Hospitalizations</p>
                      <div className="space-y-1">
                        {passport.past_medical_history.hospitalizations.map((hosp: string, i: number) => (
                          <p key={i} className="text-sm text-muted-foreground">• {hosp}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {passport.past_medical_history.major_illnesses && passport.past_medical_history.major_illnesses.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Major Illnesses</p>
                      <div className="space-y-1">
                        {passport.past_medical_history.major_illnesses.map((illness: string, i: number) => (
                          <p key={i} className="text-sm text-muted-foreground">• {illness}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Doctor & Care Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Doctor & Care Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Primary Physician</p>
                    <p className="font-medium">{passport?.primary_physician_name || 'Not set'}</p>
                    {passport?.primary_physician_contact && (
                      <p className="text-sm text-muted-foreground">{passport.primary_physician_contact}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preferred Hospital</p>
                    <p className="font-medium">{passport?.preferred_hospital || 'Not set'}</p>
                  </div>
                </div>
                {passport?.specialists && passport.specialists.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Specialists</p>
                    <div className="space-y-2">
                      {passport.specialists.map((spec: any, i: number) => (
                        <div key={i} className="p-2 bg-muted rounded">
                          <p className="font-medium text-sm">{spec.name}</p>
                          <p className="text-xs text-muted-foreground">{spec.specialty} • {spec.contact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insurance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Insurance Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{passport?.insurance_provider || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Policy Number</p>
                  <p className="font-medium">{passport?.insurance_number || 'Not set'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Critical Health Info */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Critical Health Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {passport?.implanted_devices && (
                  <div>
                    <p className="text-sm text-muted-foreground">Implanted Devices</p>
                    <p className="font-medium">{passport.implanted_devices}</p>
                  </div>
                )}
                {passport?.special_medical_needs && (
                  <div>
                    <p className="text-sm text-muted-foreground">Special Medical Needs</p>
                    <p className="font-medium">{passport.special_medical_needs}</p>
                  </div>
                )}
                {passport?.family_medical_history && (
                  <div>
                    <p className="text-sm text-muted-foreground">Family Medical History</p>
                    <p className="text-sm">{passport.family_medical_history}</p>
                  </div>
                )}
                <div className="flex gap-4">
                  {passport?.dnr_order && (
                    <Badge variant="destructive">DNR Order in Place</Badge>
                  )}
                  {passport?.organ_donor && (
                    <Badge variant="secondary">Registered Organ Donor</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{apt.service_providers?.business_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(apt.appointment_date).toLocaleDateString()}
                          </p>
                          {apt.diagnosis && (
                            <p className="text-sm mt-1">Diagnosis: {apt.diagnosis}</p>
                          )}
                        </div>
                        <Badge variant={apt.status === 'completed' ? 'default' : 'secondary'}>
                          {apt.status}
                        </Badge>
                      </div>
                    ))}
                    {appointments.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No appointments found</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Active Prescriptions</CardTitle>
                    <CardDescription>Your current medications and prescriptions</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => navigate('/medicine-reminders')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reminder
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {prescriptions.map((rx) => (
                      <div key={rx.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{rx.medication_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {rx.dosage} - {rx.frequency}
                            </p>
                          </div>
                          <Badge variant={rx.status === 'active' ? 'default' : 'secondary'}>
                            {rx.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Prescribed: {new Date(rx.prescribed_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {prescriptions.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No prescriptions found</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vaccines Tab */}
          <TabsContent value="vaccines" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vaccination Records</CardTitle>
                    <CardDescription>Your immunization history</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setVaccinationDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vaccination
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {vaccinations.map((vax) => (
                      <div key={vax.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold">{vax.vaccine_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Dose {vax.dose_number} - {new Date(vax.date_administered).toLocaleDateString()}
                            </p>
                            {vax.administered_by && (
                              <p className="text-sm text-muted-foreground">By: {vax.administered_by}</p>
                            )}
                            {vax.next_dose_date && (
                              <p className="text-sm text-primary mt-2">
                                Next dose: {new Date(vax.next_dose_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          {vax.certificate_url && (
                            <Button variant="outline" size="sm">
                              View Certificate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {vaccinations.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No vaccination records found</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lab Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Lab Reports</CardTitle>
                    <CardDescription>Your test results and medical reports</CardDescription>
                  </div>
                  <Button onClick={() => navigate('/lab-reports')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {labReports.map((report) => (
                      <div key={report.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{report.report_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(report.test_date).toLocaleDateString()} • {report.category}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    ))}
                    {labReports.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No lab reports found</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wellness Tab */}
          <TabsContent value="wellness" className="mt-6 space-y-4">
            {/* Health Goals Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Health Goals
                    </CardTitle>
                    <CardDescription>Track your wellness goals and progress</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setGoalDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Goal
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {healthGoals.map((goal) => {
                      const progress = goal.target_value > 0 
                        ? (goal.current_value / goal.target_value) * 100 
                        : 0;
                      return (
                        <div key={goal.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{goal.goal_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {goal.current_value} / {goal.target_value} {goal.unit}
                              </p>
                            </div>
                            <Badge variant={progress >= 100 ? "default" : "secondary"}>
                              {Math.round(progress)}%
                            </Badge>
                          </div>
                          <Progress value={Math.min(progress, 100)} className="h-2" />
                          {goal.target_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Target: {new Date(goal.target_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {healthGoals.length === 0 && (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No health goals yet</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => setGoalDialogOpen(true)}
                        >
                          Create Your First Goal
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Wellness Metrics */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Daily Wellness Metrics
                    </CardTitle>
                    <CardDescription>Your recent health tracking data</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => navigate('/wellness')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Today
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {wellnessData.map((data) => (
                      <div key={data.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <p className="font-medium">
                            {new Date(data.date).toLocaleDateString()}
                          </p>
                          {data.mood && (
                            <Badge variant="secondary">{data.mood}</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {data.steps && (
                            <div className="flex items-center gap-2">
                              <Footprints className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-xs text-muted-foreground">Steps</p>
                                <p className="font-medium">{data.steps.toLocaleString()}</p>
                              </div>
                            </div>
                          )}
                          {data.sleep_hours && (
                            <div className="flex items-center gap-2">
                              <Moon className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-xs text-muted-foreground">Sleep</p>
                                <p className="font-medium">{data.sleep_hours}h</p>
                              </div>
                            </div>
                          )}
                          {data.water_intake && (
                            <div className="flex items-center gap-2">
                              <Droplet className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-xs text-muted-foreground">Water</p>
                                <p className="font-medium">{data.water_intake} glasses</p>
                              </div>
                            </div>
                          )}
                          {data.heart_rate && (
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-xs text-muted-foreground">Heart Rate</p>
                                <p className="font-medium">{data.heart_rate} bpm</p>
                              </div>
                            </div>
                          )}
                          {data.exercise_minutes && (
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-xs text-muted-foreground">Exercise</p>
                                <p className="font-medium">{data.exercise_minutes} min</p>
                              </div>
                            </div>
                          )}
                          {data.weight && (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-xs text-muted-foreground">Weight</p>
                                <p className="font-medium">{data.weight} kg</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {wellnessData.length === 0 && (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground mb-2">No wellness data yet</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/wellness')}
                        >
                          Start Tracking Today
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialogs */}
      <HealthPassportEdit
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        passportData={passport}
        profileData={profile}
        onSuccess={loadUserData}
      />

      <VaccinationDialog
        open={vaccinationDialogOpen}
        onOpenChange={setVaccinationDialogOpen}
        onSuccess={loadUserData}
      />

      <HealthGoalsDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        onSuccess={loadUserData}
      />
    </div>
  );
};

export default HealthPassport;
