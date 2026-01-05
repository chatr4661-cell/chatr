import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, User, Phone, Mail, Calendar,
  FileText, Clock, ChevronRight, Plus, Filter,
  Activity, Heart, Pill, AlertCircle, MoreVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format, parseISO, differenceInYears } from 'date-fns';

interface Patient {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone_number: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  total_visits: number;
  last_visit: string | null;
  appointments: AppointmentHistory[];
}

interface AppointmentHistory {
  id: string;
  appointment_date: string;
  status: string;
  diagnosis: string | null;
  treatment_plan: any;
  notes: string | null;
  service_name?: string;
}

export default function DoctorPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    loadProviderAndPatients();
  }, []);

  const loadProviderAndPatients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/vendor/login');
        return;
      }

      // Get provider ID from service_providers or vendors
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let provId = provider?.id;

      if (!provId) {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .eq('vendor_type', 'healthcare_provider')
          .single();

        if (!vendor) {
          navigate('/vendor/register');
          return;
        }
        provId = vendor.id;
      }

      setProviderId(provId);
      await loadPatients(provId);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async (provId: string) => {
    // Get all unique patients who have had appointments with this provider
    const { data: appointmentsData, error } = await supabase
      .from('appointments')
      .select(`
        patient_id,
        appointment_date,
        status,
        diagnosis,
        treatment_plan,
        notes,
        service:services(service_name)
      `)
      .eq('provider_id', provId)
      .order('appointment_date', { ascending: false });

    if (error) {
      console.error('Error loading appointments:', error);
      return;
    }

    // Group appointments by patient
    const patientMap = new Map<string, AppointmentHistory[]>();
    (appointmentsData || []).forEach((apt: any) => {
      const patientId = apt.patient_id;
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, []);
      }
      patientMap.get(patientId)!.push({
        id: apt.id,
        appointment_date: apt.appointment_date,
        status: apt.status,
        diagnosis: apt.diagnosis,
        treatment_plan: apt.treatment_plan,
        notes: apt.notes,
        service_name: apt.service?.service_name
      });
    });

    // Get patient profiles
    const patientIds = Array.from(patientMap.keys());
    if (patientIds.length === 0) {
      setPatients([]);
      return;
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, phone_number, email, date_of_birth, gender, blood_group')
      .in('id', patientIds);

    const patientsWithHistory: Patient[] = (profilesData || []).map((profile: any) => {
      const appointments = patientMap.get(profile.id) || [];
      const completedVisits = appointments.filter(a => a.status === 'completed');
      
      return {
        ...profile,
        total_visits: completedVisits.length,
        last_visit: completedVisits[0]?.appointment_date || null,
        appointments
      };
    });

    // Sort by last visit
    patientsWithHistory.sort((a, b) => {
      if (!a.last_visit) return 1;
      if (!b.last_visit) return -1;
      return new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime();
    });

    setPatients(patientsWithHistory);
  };

  const openPatientDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
  };

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    return differenceInYears(new Date(), parseISO(dob));
  };

  const filteredPatients = patients.filter(patient => {
    if (!searchQuery) return true;
    const name = patient.full_name?.toLowerCase() || '';
    const phone = patient.phone_number || '';
    return name.includes(searchQuery.toLowerCase()) || phone.includes(searchQuery);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vendor/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">My Patients</h1>
            <p className="text-xs text-muted-foreground">{patients.length} patients</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Patients List */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredPatients.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No patients found</p>
              <p className="text-sm text-muted-foreground">
                Patients will appear here after their first appointment
              </p>
            </motion.div>
          ) : (
            filteredPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openPatientDetails(patient)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={patient.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {patient.full_name?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{patient.full_name}</h3>
                          {patient.gender && (
                            <Badge variant="outline" className="text-xs">
                              {patient.gender}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {getAge(patient.date_of_birth) && (
                            <span>{getAge(patient.date_of_birth)} yrs</span>
                          )}
                          {patient.blood_group && (
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-red-500" />
                              {patient.blood_group}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {patient.total_visits} visits
                          </span>
                        </div>

                        {patient.last_visit && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last visit: {format(parseISO(patient.last_visit), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Patient Details Dialog */}
      <Dialog open={showPatientDetails} onOpenChange={setShowPatientDetails}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>

          {selectedPatient && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Patient Info */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedPatient.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {selectedPatient.full_name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{selectedPatient.full_name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {getAge(selectedPatient.date_of_birth) && (
                      <Badge variant="outline">{getAge(selectedPatient.date_of_birth)} years</Badge>
                    )}
                    {selectedPatient.gender && (
                      <Badge variant="outline">{selectedPatient.gender}</Badge>
                    )}
                    {selectedPatient.blood_group && (
                      <Badge variant="outline" className="text-red-600">
                        <Heart className="w-3 h-3 mr-1" />
                        {selectedPatient.blood_group}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {selectedPatient.phone_number && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${selectedPatient.phone_number}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                )}
                {selectedPatient.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`mailto:${selectedPatient.email}`)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                )}
              </div>

              {/* Visit History */}
              <div className="flex-1 overflow-hidden">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Visit History ({selectedPatient.appointments.length})
                </h4>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-4">
                    {selectedPatient.appointments.map((apt) => (
                      <Card key={apt.id} className="bg-muted/30">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm">
                                {format(parseISO(apt.appointment_date), 'MMM d, yyyy')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {apt.service_name || 'Consultation'}
                              </p>
                            </div>
                            <Badge 
                              variant="outline"
                              className={
                                apt.status === 'completed' 
                                  ? 'border-green-500 text-green-600'
                                  : apt.status === 'cancelled'
                                  ? 'border-red-500 text-red-600'
                                  : ''
                              }
                            >
                              {apt.status}
                            </Badge>
                          </div>
                          
                          {apt.diagnosis && (
                            <div className="mt-2 p-2 bg-background rounded">
                              <p className="text-xs font-medium text-muted-foreground">Diagnosis</p>
                              <p className="text-sm">{apt.diagnosis}</p>
                            </div>
                          )}

                          {apt.treatment_plan?.notes && (
                            <div className="mt-2 p-2 bg-background rounded">
                              <p className="text-xs font-medium text-muted-foreground">Treatment</p>
                              <p className="text-sm">{apt.treatment_plan.notes}</p>
                            </div>
                          )}

                          {apt.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              Note: {apt.notes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
