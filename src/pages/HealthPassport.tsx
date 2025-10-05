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
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      setPassport(passportData);

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

    } catch (error) {
      console.error('Error loading health data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load health passport data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportPassport = () => {
    toast({
      title: 'Export Feature',
      description: 'PDF export coming soon!'
    });
  };

  const sharePassport = () => {
    toast({
      title: 'Share Feature',
      description: 'Secure sharing coming soon!'
    });
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
                <CardTitle>Active Prescriptions</CardTitle>
                <CardDescription>Your current medications and prescriptions</CardDescription>
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
                <CardTitle>Vaccination Records</CardTitle>
                <CardDescription>Your immunization history</CardDescription>
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
          <TabsContent value="wellness" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Wellness Tracking</CardTitle>
                    <CardDescription>Your recent health metrics</CardDescription>
                  </div>
                  <Button onClick={() => navigate('/wellness-tracking')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {wellnessData.map((data) => (
                      <div key={data.id} className="border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-3">
                          {new Date(data.date).toLocaleDateString()}
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          {data.steps && (
                            <div>
                              <p className="text-xs text-muted-foreground">Steps</p>
                              <p className="font-semibold">{data.steps}</p>
                            </div>
                          )}
                          {data.heart_rate && (
                            <div>
                              <p className="text-xs text-muted-foreground">Heart Rate</p>
                              <p className="font-semibold">{data.heart_rate} bpm</p>
                            </div>
                          )}
                          {data.sleep_hours && (
                            <div>
                              <p className="text-xs text-muted-foreground">Sleep</p>
                              <p className="font-semibold">{data.sleep_hours}h</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {wellnessData.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No wellness data found</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HealthPassport;
