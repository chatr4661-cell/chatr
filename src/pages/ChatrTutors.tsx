import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Search, Star, Clock, BookOpen, Calendar, DollarSign, Award, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Tutor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  subjects: any;
  hourly_rate: number | null;
  rating_average: number | null;
  total_sessions: number | null;
  years_experience: number | null;
  education: string | null;
  is_verified: boolean | null;
}

interface BookingForm {
  subject: string;
  session_date: string;
  duration_minutes: number;
  notes: string;
}

const ChatrTutors = () => {
  const navigate = useNavigate();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [filteredTutors, setFilteredTutors] = useState<Tutor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    subject: '',
    session_date: '',
    duration_minutes: 60,
    notes: ''
  });

  useEffect(() => {
    loadTutors();
  }, []);

  useEffect(() => {
    filterTutors();
  }, [searchQuery, selectedSubject, tutors]);

  const loadTutors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tutors')
      .select('*')
      .eq('is_active', true)
      .order('rating_average', { ascending: false });

    if (error) {
      toast.error('Failed to load tutors');
      console.error(error);
    } else {
      const tutorsData = (data || []).map(tutor => ({
        ...tutor,
        subjects: Array.isArray(tutor.subjects) ? tutor.subjects : [],
        hourly_rate: tutor.hourly_rate || 0,
        rating_average: tutor.rating_average || 0,
        total_sessions: tutor.total_sessions || 0,
        years_experience: tutor.years_experience || 0
      }));
      setTutors(tutorsData as Tutor[]);
    }
    setLoading(false);
  };

  const filterTutors = () => {
    let filtered = tutors;

    if (searchQuery) {
      filtered = filtered.filter(tutor =>
        tutor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tutor.bio || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(tutor.subjects) && tutor.subjects.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase())))
      );
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(tutor =>
        Array.isArray(tutor.subjects) && tutor.subjects.some((s: string) => s.toLowerCase() === selectedSubject.toLowerCase())
      );
    }

    setFilteredTutors(filtered);
  };

  const getAllSubjects = () => {
    const subjects = new Set<string>();
    tutors.forEach(tutor => {
      if (Array.isArray(tutor.subjects)) {
        tutor.subjects.forEach((subject: string) => subjects.add(subject));
      }
    });
    return Array.from(subjects).sort();
  };

  const handleBookSession = async () => {
    if (!selectedTutor) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please login to book a session');
      return;
    }

    if (!bookingForm.subject || !bookingForm.session_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase.from('tutor_bookings').insert({
      tutor_id: selectedTutor.id,
      student_id: user.id,
      subject: bookingForm.subject,
      session_date: bookingForm.session_date,
      duration_minutes: bookingForm.duration_minutes,
      notes: bookingForm.notes,
      amount_paid: selectedTutor.hourly_rate * (bookingForm.duration_minutes / 60),
      status: 'pending'
    });

    if (error) {
      toast.error('Failed to book session');
      console.error(error);
    } else {
      toast.success('Session booking request sent! The tutor will confirm shortly.');
      setShowBookingDialog(false);
      setBookingForm({ subject: '', session_date: '', duration_minutes: 60, notes: '' });
    }
  };

  const openBookingDialog = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    const firstSubject = Array.isArray(tutor.subjects) && tutor.subjects.length > 0 ? tutor.subjects[0] : '';
    setBookingForm({ ...bookingForm, subject: firstSubject });
    setShowBookingDialog(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-2xl">👨‍🎓</span>
            <div>
              <h1 className="text-xl font-bold">Chatr Tutors</h1>
              <p className="text-xs text-muted-foreground">Find your perfect tutor</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tutors or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>
        </div>

        {/* Subject Filter */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            <Button
              variant={selectedSubject === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSubject('all')}
              className="rounded-full"
            >
              <Filter className="h-3 w-3 mr-1" />
              All
            </Button>
            {getAllSubjects().map(subject => (
              <Button
                key={subject}
                variant={selectedSubject === subject ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSubject(subject)}
                className="rounded-full whitespace-nowrap"
              >
                {subject}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-b">
        <div className="flex justify-around text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{tutors.length}+</div>
            <div className="text-xs text-muted-foreground">Expert Tutors</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">4.9</div>
            <div className="text-xs text-muted-foreground">Avg Rating</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">10K+</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
        </div>
      </div>

      {/* Tutors List */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-20 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : filteredTutors.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No tutors found</p>
          </div>
        ) : (
          filteredTutors.map((tutor, index) => (
            <motion.div
              key={tutor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4 hover:shadow-lg transition-all cursor-pointer" onClick={() => setSelectedTutor(tutor)}>
                <div className="flex gap-3">
                  <Avatar className="h-16 w-16 text-3xl">
                    <AvatarFallback>{tutor.avatar_url}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-semibold flex items-center gap-1.5">
                          {tutor.full_name}
                          {tutor.is_verified && (
                            <Award className="h-4 w-4 text-blue-500" />
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{tutor.education}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">${tutor.hourly_rate}</div>
                        <div className="text-xs text-muted-foreground">/hour</div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{tutor.bio}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {Array.isArray(tutor.subjects) && tutor.subjects.slice(0, 3).map((subject: string) => (
                        <Badge key={subject} variant="secondary" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                      {Array.isArray(tutor.subjects) && tutor.subjects.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{tutor.subjects.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">{(tutor.rating_average || 0).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{tutor.years_experience || 0}y exp</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{tutor.total_sessions || 0} sessions</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    openBookingDialog(tutor);
                  }}
                  className="w-full mt-3"
                  size="sm"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Session
                </Button>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Tutor Detail Dialog */}
      <Dialog open={!!selectedTutor && !showBookingDialog} onOpenChange={(open) => !open && setSelectedTutor(null)}>
        <DialogContent className="max-w-lg">
          {selectedTutor && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-16 w-16 text-3xl">
                    <AvatarFallback>{selectedTutor.avatar_url}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle className="flex items-center gap-2">
                      {selectedTutor.full_name}
                      {selectedTutor.is_verified && (
                        <Award className="h-5 w-5 text-blue-500" />
                      )}
                    </DialogTitle>
                    <DialogDescription>{selectedTutor.education}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    About
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedTutor.bio}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Subjects</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(selectedTutor.subjects) && selectedTutor.subjects.map((subject: string) => (
                      <Badge key={subject} variant="secondary">{subject}</Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      Hourly Rate
                    </div>
                    <div className="text-lg font-bold">${selectedTutor.hourly_rate || 0}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Star className="h-4 w-4" />
                      Rating
                    </div>
                    <div className="text-lg font-bold">{(selectedTutor.rating_average || 0).toFixed(1)} / 5.0</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      Experience
                    </div>
                    <div className="text-lg font-bold">{selectedTutor.years_experience || 0} years</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <BookOpen className="h-4 w-4" />
                      Sessions
                    </div>
                    <div className="text-lg font-bold">{selectedTutor.total_sessions || 0}</div>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setShowBookingDialog(true);
                  }}
                  className="w-full"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book a Session
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Book a Session with {selectedTutor?.full_name}</DialogTitle>
            <DialogDescription>Fill in the details to schedule your tutoring session</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject</label>
              <select
                value={bookingForm.subject}
                onChange={(e) => setBookingForm({ ...bookingForm, subject: e.target.value })}
                className="w-full p-2 border rounded-md bg-background"
              >
                {Array.isArray(selectedTutor?.subjects) && selectedTutor.subjects.map((subject: string) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Date & Time</label>
              <Input
                type="datetime-local"
                value={bookingForm.session_date}
                onChange={(e) => setBookingForm({ ...bookingForm, session_date: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Duration</label>
              <select
                value={bookingForm.duration_minutes}
                onChange={(e) => setBookingForm({ ...bookingForm, duration_minutes: Number(e.target.value) })}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value={30}>30 minutes - ${selectedTutor && ((selectedTutor.hourly_rate || 0) * 0.5).toFixed(2)}</option>
                <option value={60}>60 minutes - ${selectedTutor?.hourly_rate || 0}</option>
                <option value={90}>90 minutes - ${selectedTutor && ((selectedTutor.hourly_rate || 0) * 1.5).toFixed(2)}</option>
                <option value={120}>120 minutes - ${selectedTutor && ((selectedTutor.hourly_rate || 0) * 2).toFixed(2)}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes (Optional)</label>
              <Textarea
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                placeholder="What would you like to focus on in this session?"
                rows={3}
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Session Duration:</span>
                <span className="font-medium">{bookingForm.duration_minutes} minutes</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Amount:</span>
                <span className="text-lg font-bold text-primary">
                  ${selectedTutor && ((selectedTutor.hourly_rate || 0) * (bookingForm.duration_minutes / 60)).toFixed(2)}
                </span>
              </div>
            </div>

            <Button onClick={handleBookSession} className="w-full">
              Confirm Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatrTutors;
