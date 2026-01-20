import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle,
  Plus, Headphones, Camera, Star, Users, IndianRupee, MapPin
} from 'lucide-react';
import { format } from 'date-fns';

interface Submission {
  id: string;
  status: string;
  created_at: string;
  audio_listened_percent: number | null;
  selected_option_index: number | null;
  media_url: string | null;
  rating: number | null;
  gps_distance_km: number | null;
  rejection_reason: string | null;
  task: {
    title: string;
    task_type: string;
    reward_rupees: number;
  };
  user: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface FraudUser {
  user_id: string;
  risk_score: number;
  is_soft_blocked: boolean;
  tasks_completed: number;
  total_earned_rupees: number;
  user: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

export default function AdminMicroTasks() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fraudUsers, setFraudUsers] = useState<FraudUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Create task form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    task_type: 'audio_listen',
    title: '',
    description: '',
    reward_coins: 50,
    reward_rupees: 5,
    audio_url: '',
    audio_duration_seconds: 30,
    verification_question: '',
    verification_options: ['', '', '', ''],
    correct_option_index: 0,
    geo_required: false,
    geo_lat: 0,
    geo_lng: 0,
    geo_radius_km: 5,
    max_completions: 100,
    max_per_user: 1,
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const { data, error } = await supabase
          .from('micro_task_submissions')
          .select(`
            *,
            task:micro_tasks(title, task_type, reward_rupees),
            user:profiles!micro_task_submissions_user_id_fkey(full_name, phone)
          `)
          .in('status', ['pending', 'manual_review'])
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setSubmissions((data || []) as unknown as Submission[]);
      } else if (activeTab === 'fraud') {
        const { data, error } = await supabase
          .from('micro_task_user_scores')
          .select(`
            *,
            user:profiles!micro_task_user_scores_user_id_fkey(full_name, phone)
          `)
          .gt('risk_score', 0)
          .order('risk_score', { ascending: false })
          .limit(50);

        if (error) throw error;
        setFraudUsers((data || []) as unknown as FraudUser[]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    setProcessing(submissionId);
    try {
      // Get submission details
      const { data: submission } = await supabase
        .from('micro_task_submissions')
        .select('*, task:micro_tasks(*)')
        .eq('id', submissionId)
        .single();

      if (!submission) throw new Error('Submission not found');

      // Update submission status
      await supabase
        .from('micro_task_submissions')
        .update({ status: 'approved' })
        .eq('id', submissionId);

      // Update assignment status
      await supabase
        .from('micro_task_assignments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', submission.assignment_id);

      // Award coins - use chatr_coin_transactions
      const task = submission.task as { reward_coins: number; reward_rupees: number };
      await supabase.from('chatr_coin_transactions').insert({
        user_id: submission.user_id,
        amount: task.reward_coins,
        transaction_type: 'credit',
        source: 'micro_task',
        description: `Earned from task completion`,
      });

      // Update coin balance
      const { data: currentBalance } = await supabase
        .from('chatr_coin_balances')
        .select('total_coins, lifetime_earned')
        .eq('user_id', submission.user_id)
        .maybeSingle();

      if (currentBalance) {
        await supabase
          .from('chatr_coin_balances')
          .update({
            total_coins: currentBalance.total_coins + task.reward_coins,
            lifetime_earned: currentBalance.lifetime_earned + task.reward_coins,
          })
          .eq('user_id', submission.user_id);
      } else {
        await supabase.from('chatr_coin_balances').insert({
          user_id: submission.user_id,
          total_coins: task.reward_coins,
          lifetime_earned: task.reward_coins,
        });
      }

      // Update user task score
      const { data: currentScore } = await supabase
        .from('micro_task_user_scores')
        .select('tasks_completed, total_earned_coins, total_earned_rupees')
        .eq('user_id', submission.user_id)
        .maybeSingle();

      if (currentScore) {
        await supabase
          .from('micro_task_user_scores')
          .update({
            tasks_completed: currentScore.tasks_completed + 1,
            total_earned_coins: currentScore.total_earned_coins + task.reward_coins,
            total_earned_rupees: Number(currentScore.total_earned_rupees) + task.reward_rupees,
          })
          .eq('user_id', submission.user_id);
      }

      toast.success('Submission approved!');
      fetchData();
    } catch (err) {
      console.error('Error approving:', err);
      toast.error('Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (submissionId: string, reason: string = 'Manual rejection') => {
    setProcessing(submissionId);
    try {
      const { data: submission } = await supabase
        .from('micro_task_submissions')
        .select('assignment_id')
        .eq('id', submissionId)
        .single();

      await supabase
        .from('micro_task_submissions')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', submissionId);

      if (submission) {
        await supabase
          .from('micro_task_assignments')
          .update({ status: 'rejected' })
          .eq('id', submission.assignment_id);
      }

      toast.success('Submission rejected');
      fetchData();
    } catch (err) {
      console.error('Error rejecting:', err);
      toast.error('Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleBlock = async (userId: string, currentlyBlocked: boolean) => {
    try {
      await supabase
        .from('micro_task_user_scores')
        .update({ is_soft_blocked: !currentlyBlocked })
        .eq('user_id', userId);

      toast.success(currentlyBlocked ? 'User unblocked' : 'User blocked');
      fetchData();
    } catch (err) {
      console.error('Error toggling block:', err);
      toast.error('Failed to update user');
    }
  };

  const handleCreateTask = async () => {
    try {
      const { error } = await supabase
        .from('micro_tasks')
        .insert({
          ...taskForm,
          verification_options: taskForm.verification_options.filter(o => o.trim()),
          is_active: true,
        });

      if (error) throw error;
      
      toast.success('Task created!');
      setShowCreateForm(false);
      setTaskForm({
        task_type: 'audio_listen',
        title: '',
        description: '',
        reward_coins: 50,
        reward_rupees: 5,
        audio_url: '',
        audio_duration_seconds: 30,
        verification_question: '',
        verification_options: ['', '', '', ''],
        correct_option_index: 0,
        geo_required: false,
        geo_lat: 0,
        geo_lng: 0,
        geo_radius_km: 5,
        max_completions: 100,
        max_per_user: 1,
      });
    } catch (err) {
      console.error('Error creating task:', err);
      toast.error('Failed to create task');
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'audio_listen': return <Headphones className="w-4 h-4" />;
      case 'photo_verify': return <Camera className="w-4 h-4" />;
      case 'rate_service': return <Star className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Micro-Tasks Admin</h1>
              <p className="text-xs text-muted-foreground">Manage tasks, submissions & fraud</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Create Task
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="pending">
              <Clock className="w-4 h-4 mr-1" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="w-4 h-4 mr-1" />
              Create
            </TabsTrigger>
            <TabsTrigger value="fraud">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Fraud
            </TabsTrigger>
          </TabsList>

          {/* Pending Submissions */}
          <TabsContent value="pending" className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))
            ) : submissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-muted-foreground">No pending submissions</p>
                </CardContent>
              </Card>
            ) : (
              submissions.map(submission => (
                <Card key={submission.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTaskIcon(submission.task?.task_type || '')}
                          <span className="font-medium">{submission.task?.title}</span>
                          <Badge variant={submission.status === 'manual_review' ? 'destructive' : 'secondary'}>
                            {submission.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>User: {submission.user?.full_name || submission.user?.phone || 'Unknown'}</p>
                          <p>Submitted: {format(new Date(submission.created_at), 'MMM d, h:mm a')}</p>
                          {submission.audio_listened_percent && (
                            <p>Audio listened: {submission.audio_listened_percent}%</p>
                          )}
                          {submission.rating && (
                            <p>Rating: {submission.rating}/5</p>
                          )}
                          {submission.gps_distance_km !== null && (
                            <p className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Distance: {submission.gps_distance_km.toFixed(2)} km
                            </p>
                          )}
                          {submission.media_url && (
                            <a href={submission.media_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              View photo
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-green-600">
                          ₹{submission.task?.reward_rupees}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(submission.id)}
                          disabled={processing === submission.id}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(submission.id)}
                          disabled={processing === submission.id}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Create Task Form */}
          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Task</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label>Task Type</Label>
                    <Select
                      value={taskForm.task_type}
                      onValueChange={(v) => setTaskForm({ ...taskForm, task_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="audio_listen">Audio Listen (₹5–₹10)</SelectItem>
                        <SelectItem value="photo_verify">Photo Verify (₹15–₹20)</SelectItem>
                        <SelectItem value="rate_service">Rate Service (₹5–₹10)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Title</Label>
                    <Input
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      placeholder="e.g., Listen to hostel lunch offer"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      placeholder="Detailed instructions..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Reward (₹)</Label>
                      <Input
                        type="number"
                        value={taskForm.reward_rupees}
                        onChange={(e) => setTaskForm({ 
                          ...taskForm, 
                          reward_rupees: Number(e.target.value),
                          reward_coins: Number(e.target.value) * 10 
                        })}
                      />
                    </div>
                    <div>
                      <Label>Max Completions</Label>
                      <Input
                        type="number"
                        value={taskForm.max_completions}
                        onChange={(e) => setTaskForm({ ...taskForm, max_completions: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {taskForm.task_type === 'audio_listen' && (
                    <>
                      <div>
                        <Label>Audio URL</Label>
                        <Input
                          value={taskForm.audio_url}
                          onChange={(e) => setTaskForm({ ...taskForm, audio_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label>Audio Duration (seconds)</Label>
                        <Input
                          type="number"
                          value={taskForm.audio_duration_seconds}
                          onChange={(e) => setTaskForm({ ...taskForm, audio_duration_seconds: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Verification Question</Label>
                        <Input
                          value={taskForm.verification_question}
                          onChange={(e) => setTaskForm({ ...taskForm, verification_question: e.target.value })}
                          placeholder="What was mentioned in the audio?"
                        />
                      </div>
                      <div>
                        <Label>Answer Options (mark correct with selector)</Label>
                        <div className="space-y-2">
                          {taskForm.verification_options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="correct"
                                checked={taskForm.correct_option_index === i}
                                onChange={() => setTaskForm({ ...taskForm, correct_option_index: i })}
                              />
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...taskForm.verification_options];
                                  newOpts[i] = e.target.value;
                                  setTaskForm({ ...taskForm, verification_options: newOpts });
                                }}
                                placeholder={`Option ${i + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {(taskForm.task_type === 'photo_verify' || taskForm.task_type === 'rate_service') && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={taskForm.geo_required}
                          onCheckedChange={(v) => setTaskForm({ ...taskForm, geo_required: v })}
                        />
                        <Label>Require GPS verification</Label>
                      </div>
                      
                      {taskForm.geo_required && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Latitude</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={taskForm.geo_lat}
                              onChange={(e) => setTaskForm({ ...taskForm, geo_lat: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label>Longitude</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={taskForm.geo_lng}
                              onChange={(e) => setTaskForm({ ...taskForm, geo_lng: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label>Radius (km)</Label>
                            <Input
                              type="number"
                              step="0.5"
                              value={taskForm.geo_radius_km}
                              onChange={(e) => setTaskForm({ ...taskForm, geo_radius_km: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button onClick={handleCreateTask} className="w-full">
                  Create Task
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fraud Monitor */}
          <TabsContent value="fraud" className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))
            ) : fraudUsers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No flagged users</p>
                </CardContent>
              </Card>
            ) : (
              fraudUsers.map(user => (
                <Card key={user.user_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {user.user?.full_name || user.user?.phone || 'Unknown'}
                          </span>
                          {user.is_soft_blocked && (
                            <Badge variant="destructive">Blocked</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <p className="flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            Risk Score: <span className="font-medium text-amber-600">{user.risk_score}</span>
                          </p>
                          <p>Tasks completed: {user.tasks_completed}</p>
                          <p className="flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            Total earned: ₹{Number(user.total_earned_rupees).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={user.is_soft_blocked ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => handleToggleBlock(user.user_id, user.is_soft_blocked)}
                      >
                        {user.is_soft_blocked ? 'Unblock' : 'Block'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
