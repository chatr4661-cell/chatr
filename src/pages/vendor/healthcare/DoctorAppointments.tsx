import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Calendar, Clock, User, Phone, Video,
  CheckCircle, XCircle, MessageSquare, Filter, Search,
  ChevronRight, AlertCircle, Stethoscope, FileText,
  RefreshCw, MoreVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, parseISO, addDays } from 'date-fns';

interface Appointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  diagnosis: string | null;
  treatment_plan: any;
  follow_up_date: string | null;
  payment_method: string | null;
  points_used: number | null;
  cash_amount: number | null;
  created_at: string;
  patient?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    phone_number: string | null;
  };
  service?: {
    service_name: string;
    base_price: number;
  };
}

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [followUpDays, setFollowUpDays] = useState('');
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    loadProviderAndAppointments();
  }, [activeTab]);

  const loadProviderAndAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/vendor/login');
        return;
      }

      // Get provider ID
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!provider) {
        // Check vendors table for healthcare_provider
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
        setProviderId(vendor.id);
        await loadAppointments(vendor.id);
      } else {
        setProviderId(provider.id);
        await loadAppointments(provider.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async (provId: string) => {
    const now = new Date().toISOString();
    
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(id, full_name, avatar_url, phone_number),
        service:services(service_name, base_price)
      `)
      .eq('provider_id', provId);

    if (activeTab === 'upcoming') {
      query = query.gte('appointment_date', now).in('status', ['scheduled', 'confirmed']);
    } else if (activeTab === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      query = query
        .gte('appointment_date', todayStart.toISOString())
        .lte('appointment_date', todayEnd.toISOString());
    } else if (activeTab === 'completed') {
      query = query.eq('status', 'completed');
    } else if (activeTab === 'cancelled') {
      query = query.in('status', ['cancelled', 'no_show']);
    }

    query = query.order('appointment_date', { ascending: activeTab !== 'completed' });

    const { data, error } = await query;

    if (error) {
      console.error('Error loading appointments:', error);
      return;
    }

    setAppointments((data || []) as unknown as Appointment[]);
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success(`Appointment ${status}`);
      if (providerId) loadAppointments(providerId);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const completeAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const updateData: any = {
        status: 'completed',
        diagnosis: diagnosis || null,
        treatment_plan: treatmentNotes ? { notes: treatmentNotes } : null,
        updated_at: new Date().toISOString()
      };

      if (followUpDays) {
        updateData.follow_up_date = format(addDays(new Date(), parseInt(followUpDays)), 'yyyy-MM-dd');
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast.success('Appointment completed successfully');
      setShowCompleteDialog(false);
      setSelectedAppointment(null);
      setDiagnosis('');
      setTreatmentNotes('');
      setFollowUpDays('');
      if (providerId) loadAppointments(providerId);
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('Failed to complete appointment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
      case 'no_show':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatAppointmentDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const filteredAppointments = appointments.filter(apt => {
    if (!searchQuery) return true;
    const patientName = apt.patient?.full_name?.toLowerCase() || '';
    return patientName.includes(searchQuery.toLowerCase());
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
            <h1 className="font-bold text-lg">Appointments</h1>
            <p className="text-xs text-muted-foreground">Manage your patient appointments</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => providerId && loadAppointments(providerId)}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Appointments List */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredAppointments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No appointments found</p>
            </motion.div>
          ) : (
            filteredAppointments.map((appointment, index) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={appointment.patient?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {appointment.patient?.full_name?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold truncate">
                              {appointment.patient?.full_name || 'Unknown Patient'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {appointment.service?.service_name || 'Consultation'}
                            </p>
                          </div>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatAppointmentDate(appointment.appointment_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{appointment.duration_minutes} min</span>
                          </div>
                        </div>

                        {appointment.notes && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                            {appointment.notes}
                          </p>
                        )}

                        {/* Action Buttons */}
                        {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                if (appointment.patient?.phone_number) {
                                  window.open(`tel:${appointment.patient.phone_number}`);
                                }
                              }}
                            >
                              <Phone className="w-3.5 h-3.5 mr-1" />
                              Call
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setShowCompleteDialog(true);
                              }}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}

                        {appointment.status === 'completed' && appointment.diagnosis && (
                          <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                            <p className="text-xs font-medium flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Diagnosis: {appointment.diagnosis}
                            </p>
                            {appointment.follow_up_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Follow-up: {format(parseISO(appointment.follow_up_date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Complete Appointment Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Complete Appointment
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarFallback>
                    {selectedAppointment.patient?.full_name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedAppointment.patient?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatAppointmentDate(selectedAppointment.appointment_date)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Diagnosis</Label>
                  <Input
                    placeholder="Enter diagnosis..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Treatment Notes</Label>
                  <Textarea
                    placeholder="Enter treatment notes, prescriptions..."
                    value={treatmentNotes}
                    onChange={(e) => setTreatmentNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Schedule Follow-up</Label>
                  <Select value={followUpDays} onValueChange={setFollowUpDays}>
                    <SelectTrigger>
                      <SelectValue placeholder="No follow-up needed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No follow-up</SelectItem>
                      <SelectItem value="3">In 3 days</SelectItem>
                      <SelectItem value="7">In 1 week</SelectItem>
                      <SelectItem value="14">In 2 weeks</SelectItem>
                      <SelectItem value="30">In 1 month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCompleteDialog(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={completeAppointment}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
