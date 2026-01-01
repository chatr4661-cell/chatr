import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Brain, 
  Heart, 
  MessageCircle,
  Calendar,
  Phone,
  Video,
  Search,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Smile,
  Frown,
  Meh,
  Languages
} from 'lucide-react';
import { toast } from 'sonner';

interface Therapist {
  id: string;
  name: string;
  specialties: string[];
  rating: number;
  experience_years: number;
  avatar_url?: string;
  consultation_fee: number;
  languages: string[];
  offers_teletherapy: boolean;
  therapy_modes: string[];
}

interface Assessment {
  id: string;
  assessment_type: string;
  score: number;
  interpretation: string;
  assessed_at: string;
}

const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling/staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you're a failure",
  "Trouble concentrating on things",
  "Moving or speaking slowly / being fidgety or restless",
  "Thoughts that you would be better off dead or of hurting yourself"
];

const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it's hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen"
];

const ANSWER_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" }
];

export default function MentalHealth() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Assessment state
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentType, setAssessmentType] = useState<'phq9' | 'gad7'>('phq9');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: string; content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);
    loadData(user.id);
  };

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      // Load mental health providers
      const { data: providers } = await supabase
        .from('chatr_healthcare')
        .select('*')
        .eq('is_mental_health_provider', true)
        .eq('is_active', true);
      
      if (providers) {
        setTherapists(providers.map((p: any) => ({
          id: p.id,
          name: p.name,
          specialties: p.mental_health_specialties || [],
          rating: 4.5,
          experience_years: 5,
          avatar_url: p.image_url,
          consultation_fee: p.consultation_fee || 500,
          languages: p.languages || ['English', 'Hindi'],
          offers_teletherapy: p.offers_teletherapy || false,
          therapy_modes: p.therapy_modes || ['in-person']
        })));
      }

      // Load past assessments
      const { data: assessmentData } = await supabase
        .from('mental_health_assessments')
        .select('*')
        .eq('user_id', userId)
        .order('assessed_at', { ascending: false })
        .limit(10);
      
      if (assessmentData) setAssessments(assessmentData as unknown as Assessment[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = (type: 'phq9' | 'gad7') => {
    setAssessmentType(type);
    setCurrentQuestion(0);
    setAnswers([]);
    setAssessmentResult(null);
    setAssessmentOpen(true);
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    const questions = assessmentType === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitAssessment(newAnswers);
    }
  };

  const submitAssessment = async (finalAnswers: number[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('mental-health-assistant', {
        body: {
          action: 'assessment',
          assessment_type: assessmentType,
          answers: finalAnswers
        }
      });

      if (error) throw error;
      setAssessmentResult(data);
      if (user) loadData(user.id);
    } catch (error) {
      toast.error('Failed to submit assessment');
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages([...chatMessages, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('mental-health-assistant', {
        body: {
          action: 'chat',
          message: userMessage,
          history: chatMessages
        }
      });

      if (error) throw error;
      setChatMessages([
        ...chatMessages,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: data.response }
      ]);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  const getSeverityFromScore = (score: number, type: string) => {
    if (type === 'phq9') {
      if (score <= 4) return 'minimal';
      if (score <= 9) return 'mild';
      if (score <= 14) return 'moderate';
      if (score <= 19) return 'moderately severe';
      return 'severe';
    }
    if (score <= 4) return 'minimal';
    if (score <= 9) return 'mild';
    if (score <= 14) return 'moderate';
    return 'severe';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'minimal': return 'bg-green-100 text-green-700';
      case 'mild': return 'bg-yellow-100 text-yellow-700';
      case 'moderate': return 'bg-orange-100 text-orange-700';
      case 'moderately severe': return 'bg-red-100 text-red-700';
      case 'severe': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const questions = assessmentType === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl font-bold">Mental Health</h1>
                <p className="text-sm text-purple-100">Your mental wellness matters</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChatOpen(true)}
              className="text-white hover:bg-white/20"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50"
              onClick={() => startAssessment('phq9')}
            >
              <CardContent className="p-4 text-center">
                <Brain className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="font-medium">Depression Check</p>
                <p className="text-xs text-muted-foreground">PHQ-9 Assessment</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50"
              onClick={() => startAssessment('gad7')}
            >
              <CardContent className="p-4 text-center">
                <Heart className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                <p className="font-medium">Anxiety Check</p>
                <p className="text-xs text-muted-foreground">GAD-7 Assessment</p>
              </CardContent>
            </Card>
          </div>

          {/* Crisis Support Banner */}
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Need immediate help?</p>
                  <p className="text-sm text-red-700 mb-2">
                    If you're in crisis, please reach out to a helpline.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-red-300 text-red-700"
                    onClick={() => window.open('tel:9152987821')}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    iCall: 9152987821
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Past Assessments */}
          {assessments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Assessments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assessments.slice(0, 5).map((assessment) => {
                  const severity = getSeverityFromScore(assessment.score, assessment.assessment_type);
                  return (
                  <div key={assessment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">
                        {assessment.assessment_type.toUpperCase()} Assessment
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(assessment.assessed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getSeverityColor(severity)}>
                        {severity}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Score: {assessment.score}
                      </p>
                    </div>
                  </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Find Therapists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Find a Therapist
              </CardTitle>
              <CardDescription>
                Connect with mental health professionals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by specialty, language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-3">
                {therapists.length > 0 ? (
                  therapists
                    .filter(t => 
                      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((therapist) => (
                      <TherapistCard key={therapist.id} therapist={therapist} />
                    ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No mental health providers found</p>
                    <p className="text-sm">Check back soon!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Wellness Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Self-Care Resources</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col">
                <Smile className="h-6 w-6 mb-2 text-yellow-500" />
                <span>Breathing Exercises</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col">
                <Brain className="h-6 w-6 mb-2 text-purple-500" />
                <span>Meditation</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col">
                <Heart className="h-6 w-6 mb-2 text-pink-500" />
                <span>Gratitude Journal</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col">
                <Clock className="h-6 w-6 mb-2 text-blue-500" />
                <span>Sleep Tips</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Assessment Dialog */}
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {assessmentType === 'phq9' ? 'PHQ-9 Depression Screening' : 'GAD-7 Anxiety Screening'}
            </DialogTitle>
          </DialogHeader>
          
          {!assessmentResult ? (
            <div className="space-y-6">
              <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Question {currentQuestion + 1} of {questions.length}
              </p>
              
              <p className="font-medium text-center">
                Over the last 2 weeks, how often have you been bothered by:
              </p>
              <p className="text-lg text-center">
                {questions[currentQuestion]}
              </p>

              <div className="space-y-2">
                {ANSWER_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAnswer(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getSeverityColor(assessmentResult.severity)}`}>
                {assessmentResult.severity === 'Minimal' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="font-medium">{assessmentResult.severity}</span>
              </div>
              
              <p className="text-3xl font-bold">{assessmentResult.score}</p>
              <p className="text-muted-foreground">Your Score</p>
              
              <p className="text-sm">{assessmentResult.interpretation}</p>

              {assessmentResult.recommendations && (
                <div className="text-left bg-muted p-4 rounded-lg">
                  <p className="font-medium mb-2">Recommendations:</p>
                  <ul className="text-sm space-y-1">
                    {assessmentResult.recommendations.map((rec: string, i: number) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={() => setAssessmentOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Mental Health Support
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Hi! I'm here to listen and support you.</p>
                  <p className="text-sm">How are you feeling today?</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-muted'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100" />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 pt-4 border-t">
            <Input
              placeholder="Type your message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
            />
            <Button onClick={sendChatMessage} disabled={chatLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TherapistCard({ therapist }: { therapist: Therapist }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-3 p-4 border rounded-lg hover:shadow-md transition-shadow">
      <Avatar className="h-12 w-12">
        <AvatarImage src={therapist.avatar_url} />
        <AvatarFallback>{therapist.name.charAt(0)}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{therapist.name}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {therapist.rating} • {therapist.experience_years} yrs exp
            </div>
          </div>
          <p className="font-medium text-green-600">₹{therapist.consultation_fee}</p>
        </div>
        
        <div className="flex flex-wrap gap-1 mt-2">
          {therapist.specialties.slice(0, 3).map((spec, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {spec}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3">
          {therapist.offers_teletherapy && (
            <>
              <Button size="sm" variant="outline" className="h-8">
                <Video className="h-3 w-3 mr-1" />
                Video
              </Button>
              <Button size="sm" variant="outline" className="h-8">
                <Phone className="h-3 w-3 mr-1" />
                Call
              </Button>
            </>
          )}
          <Button size="sm" className="h-8 ml-auto">
            <Calendar className="h-3 w-3 mr-1" />
            Book
          </Button>
        </div>
      </div>
    </div>
  );
}
