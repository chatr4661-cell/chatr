import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppleHeader } from '@/components/ui/AppleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Stethoscope, Calendar, Clock, Plus, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Application = { id: string; status: string; full_name: string; specialty: string };
type Availability = { id: string; day_of_week: number; start_time: string; end_time: string; slot_minutes: number; is_active: boolean };
type Appointment = {
  id: string; patient_id: string; appointment_date: string; status: string; notes: string | null;
  diagnosis: string | null; treatment_plan: any; follow_up_date: string | null;
  patient?: { username: string | null; avatar_url: string | null };
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DoctorPortal() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [consultOpen, setConsultOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [planText, setPlanText] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New slot form
  const [newSlot, setNewSlot] = useState({ day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_minutes: 30 });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate('/auth'); return; }
      setUserId(data.user.id);
    });
  }, [navigate]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [appR, avR, apptR] = await Promise.all([
      supabase.from('doctor_applications').select('id,status,full_name,specialty').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('doctor_availability').select('*').eq('doctor_id', userId).order('day_of_week'),
      supabase.from('appointments').select('*, patient:profiles!appointments_patient_id_fkey(username, avatar_url)').eq('provider_id', userId).order('appointment_date', { ascending: true }),
    ]);
    setApplication(appR.data as any);
    setAvailability((avR.data as any) || []);
    setAppointments((apptR.data as any) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel('doctor-portal-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `provider_id=eq.${userId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);

  const addSlot = async () => {
    if (!userId) return;
    if (newSlot.start_time >= newSlot.end_time) { toast.error('End time must be after start'); return; }
    const { error } = await supabase.from('doctor_availability').insert({ doctor_id: userId, ...newSlot, is_active: true });
    if (error) { toast.error(error.message); return; }
    toast.success('Availability added');
    load();
  };

  const removeSlot = async (id: string) => {
    await supabase.from('doctor_availability').delete().eq('id', id);
    load();
  };

  const toggleSlot = async (slot: Availability) => {
    await supabase.from('doctor_availability').update({ is_active: !slot.is_active }).eq('id', slot.id);
    load();
  };

  const setApptStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${status}`);
  };

  const openConsult = (a: Appointment) => {
    setSelected(a);
    setDiagnosis(a.diagnosis || '');
    setPlanText(typeof a.treatment_plan === 'object' && a.treatment_plan?.text ? a.treatment_plan.text : '');
    setFollowUp(a.follow_up_date || '');
    setConsultOpen(true);
  };

  const submitConsult = async () => {
    if (!selected) return;
    setSubmitting(true);
    const { error } = await supabase.from('appointments').update({
      diagnosis: diagnosis || null,
      treatment_plan: planText ? { text: planText } : {},
      follow_up_date: followUp || null,
      status: 'completed',
    }).eq('id', selected.id);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Consultation saved');
    setConsultOpen(false);
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // Not yet applied or pending
  if (!application || application.status !== 'approved') {
    return (
      <div className="min-h-screen bg-background safe-area-pb">
        <AppleHeader title="Doctor Portal" onBack={() => navigate('/')} glass />
        <div className="max-w-md mx-auto px-4 mt-12 text-center space-y-4">
          <Stethoscope className="w-16 h-16 mx-auto text-primary opacity-60" />
          {!application ? (
            <>
              <h2 className="text-xl font-semibold">Become a verified doctor</h2>
              <p className="text-sm text-muted-foreground">Apply to offer consultations on Chatr.</p>
              <Button onClick={() => navigate('/doctor-onboarding')}>Start application</Button>
            </>
          ) : application.status === 'pending' ? (
            <>
              <h2 className="text-xl font-semibold">Application under review</h2>
              <p className="text-sm text-muted-foreground">We'll notify you once verified — typically within 24-48 hours.</p>
              <Badge>Pending</Badge>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">Application rejected</h2>
              <p className="text-sm text-muted-foreground">Please re-submit with corrected details.</p>
              <Button onClick={() => navigate('/doctor-onboarding')}>Re-apply</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  const upcoming = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));
  const past = appointments.filter(a => ['completed', 'cancelled'].includes(a.status));

  return (
    <div className="min-h-screen bg-background safe-area-pb">
      <AppleHeader title="Doctor Portal" onBack={() => navigate('/')} glass />
      <div className="max-w-2xl mx-auto px-4 pb-24 mt-4">
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl"><Stethoscope className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="font-semibold">Dr. {application.full_name}</p>
              <p className="text-xs text-muted-foreground">{application.specialty} · Verified</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {upcoming.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Calendar className="w-10 h-10 mx-auto opacity-30 mb-2" />No upcoming appointments</div>
            ) : upcoming.map(a => (
              <div key={a.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{a.patient?.username || 'Patient'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(a.appointment_date).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={a.status === 'confirmed' ? 'default' : 'secondary'}>{a.status}</Badge>
                </div>
                {a.notes && <p className="text-sm text-muted-foreground">{a.notes}</p>}
                <div className="flex flex-wrap gap-2">
                  {a.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => setApptStatus(a.id, 'confirmed')}>
                        <CheckCircle2 className="w-3 h-3 mr-1" />Confirm
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setApptStatus(a.id, 'cancelled')}>
                        <XCircle className="w-3 h-3 mr-1" />Decline
                      </Button>
                    </>
                  )}
                  {a.status === 'confirmed' && (
                    <Button size="sm" onClick={() => openConsult(a)}>Start consult</Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 mt-4">
            {past.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No past appointments</div>
            ) : past.map(a => (
              <div key={a.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{a.patient?.username || 'Patient'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.appointment_date).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
                {a.diagnosis && <p className="text-sm mt-2"><span className="font-medium">Dx:</span> {a.diagnosis}</p>}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-3 mt-4">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium">Add availability</p>
              <div className="grid grid-cols-2 gap-2">
                <select className="bg-background border border-input rounded-md h-10 px-3 text-sm"
                  value={newSlot.day_of_week}
                  onChange={e => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <Input type="number" min={5} step={5} value={newSlot.slot_minutes}
                  onChange={e => setNewSlot({ ...newSlot, slot_minutes: parseInt(e.target.value) || 30 })} placeholder="Slot mins" />
                <Input type="time" value={newSlot.start_time} onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })} />
                <Input type="time" value={newSlot.end_time} onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })} />
              </div>
              <Button onClick={addSlot} className="w-full"><Plus className="w-4 h-4 mr-1" />Add slot</Button>
            </div>

            {availability.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No slots set</p>
            ) : availability.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{DAYS[s.day_of_week]} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</p>
                  <p className="text-xs text-muted-foreground">{s.slot_minutes}-min slots</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleSlot(s)}>
                    {s.is_active ? 'Pause' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeSlot(s.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={consultOpen} onOpenChange={setConsultOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Consultation — {selected?.patient?.username}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Textarea placeholder="Diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} />
            <Textarea placeholder="Treatment plan / prescription" value={planText} onChange={e => setPlanText(e.target.value)} rows={5} />
            <Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} placeholder="Follow-up date" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsultOpen(false)}>Cancel</Button>
            <Button onClick={submitConsult} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Complete & save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
