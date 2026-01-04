import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, Calendar, Clock, MapPin, Phone, Video, 
  CheckCircle, XCircle, AlertCircle, Plus, Stethoscope
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  notes?: string;
  provider_id: string;
  provider?: {
    name: string;
    specialty: string;
    city: string;
    image_url?: string;
    phone?: string;
  };
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pending: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Pending' },
  confirmed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Confirmed' },
  completed: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Completed' },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Cancelled' },
};

export default function MyAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', user.id)
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      // Fetch provider details for each appointment
      const appointmentsWithProviders = await Promise.all(
        (data || []).map(async (apt) => {
          const { data: provider } = await supabase
            .from('chatr_healthcare')
            .select('name, specialty, city, image_url, phone')
            .eq('id', apt.provider_id)
            .single();
          return { ...apt, provider };
        })
      );

      setAppointments(appointmentsWithProviders);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success('Appointment cancelled');
      loadAppointments();
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  const upcomingAppointments = appointments.filter(
    apt => new Date(apt.appointment_date) >= new Date() && apt.status !== 'cancelled'
  );
  const pastAppointments = appointments.filter(
    apt => new Date(apt.appointment_date) < new Date() || apt.status === 'cancelled'
  );

  const renderAppointmentCard = (appointment: Appointment, isPast: boolean = false) => {
    const status = statusConfig[appointment.status] || statusConfig.pending;
    const StatusIcon = status.icon;
    const appointmentDate = new Date(appointment.appointment_date);

    return (
      <motion.div
        key={appointment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={`${isPast ? 'opacity-70' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold truncate">
                    {appointment.provider?.name || 'Doctor'}
                  </h4>
                  <Badge className={`${status.bg} ${status.color} border-0`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {appointment.provider?.specialty}
                </p>
                
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(appointmentDate, 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(appointmentDate, 'h:mm a')}
                  </div>
                  {appointment.provider?.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {appointment.provider.city}
                    </div>
                  )}
                </div>

                {appointment.notes && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                    {appointment.notes}
                  </p>
                )}
              </div>
            </div>

            {!isPast && appointment.status !== 'cancelled' && (
              <div className="flex gap-2 mt-4">
                {appointment.provider?.phone && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => window.location.href = `tel:${appointment.provider?.phone}`}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => navigate(`/teleconsultation?provider=${appointment.provider_id}`)}
                >
                  <Video className="h-4 w-4 mr-1" />
                  Video
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleCancelAppointment(appointment.id)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="My Appointments | Chatr Care"
        description="View and manage your healthcare appointments on Chatr"
      />
      
      <div className="min-h-screen bg-background pb-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate(-1)}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">My Appointments</h1>
                  <p className="text-sm text-white/80">{appointments.length} total appointments</p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="bg-white/20 text-white hover:bg-white/30"
                onClick={() => navigate('/care?tab=doctors')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Book New
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-background shadow-sm">
              <TabsTrigger value="upcoming" className="flex-1">
                Upcoming ({upcomingAppointments.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="flex-1">
                Past ({pastAppointments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((apt) => renderAppointmentCard(apt))
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No Upcoming Appointments</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Book an appointment with a doctor
                  </p>
                  <Button onClick={() => navigate('/care?tab=doctors')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Find Doctors
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-4 space-y-3">
              {pastAppointments.length > 0 ? (
                pastAppointments.map((apt) => renderAppointmentCard(apt, true))
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No Past Appointments</h3>
                  <p className="text-sm text-muted-foreground">
                    Your appointment history will appear here
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
