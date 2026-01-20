import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MicroTask {
  id: string;
  task_type: 'audio_listen' | 'photo_verify' | 'rate_service';
  title: string;
  description: string | null;
  reward_coins: number;
  reward_rupees: number;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  verification_question: string | null;
  verification_options: string[] | null;
  correct_option_index: number | null;
  geo_required: boolean;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_km: number | null;
  max_completions: number;
  current_completions: number;
  max_per_user: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'completed' | 'expired' | 'rejected';
  assigned_at: string;
  expires_at: string;
  completed_at: string | null;
}

export interface TaskSubmission {
  id: string;
  assignment_id: string;
  task_id: string;
  user_id: string;
  audio_listened_percent: number | null;
  selected_option_index: number | null;
  media_url: string | null;
  media_hash: string | null;
  rating: number | null;
  voice_note_url: string | null;
  submitted_lat: number | null;
  submitted_lng: number | null;
  gps_distance_km: number | null;
  device_hash: string | null;
  status: 'pending' | 'auto_approved' | 'auto_rejected' | 'manual_review' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
}

export interface UserTaskScore {
  risk_score: number;
  is_soft_blocked: boolean;
  tasks_completed: number;
  total_earned_coins: number;
  total_earned_rupees: number;
}

// Generate a simple device hash for fraud detection
function generateDeviceHash(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('CHATR', 2, 2);
  }
  const canvasData = canvas.toDataURL();
  
  const userAgent = navigator.userAgent;
  const screenRes = `${screen.width}x${screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const rawString = `${canvasData}|${userAgent}|${screenRes}|${timezone}`;
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Haversine distance calculation
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useMicroTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MicroTask[]>([]);
  const [myAssignments, setMyAssignments] = useState<TaskAssignment[]>([]);
  const [myScore, setMyScore] = useState<UserTaskScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available tasks
  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('micro_tasks')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('reward_rupees', { ascending: false });

      if (error) throw error;
      
      // Filter out tasks user has already done
      const { data: assignments } = await supabase
        .from('micro_task_assignments')
        .select('task_id')
        .eq('user_id', user?.id || '');

      const completedTaskIds = new Set(assignments?.map(a => a.task_id) || []);
      const availableTasks = (data || []).filter(t => !completedTaskIds.has(t.id));
      
      setTasks(availableTasks as MicroTask[]);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    }
  }, [user?.id]);

  // Fetch user's assignments
  const fetchMyAssignments = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('micro_task_assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setMyAssignments(data as TaskAssignment[]);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
    }
  }, [user?.id]);

  // Fetch user's score
  const fetchMyScore = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('micro_task_user_scores')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setMyScore({
          risk_score: data.risk_score || 0,
          is_soft_blocked: data.is_soft_blocked || false,
          tasks_completed: data.tasks_completed || 0,
          total_earned_coins: data.total_earned_coins || 0,
          total_earned_rupees: Number(data.total_earned_rupees) || 0,
        });
      } else {
        setMyScore({
          risk_score: 0,
          is_soft_blocked: false,
          tasks_completed: 0,
          total_earned_coins: 0,
          total_earned_rupees: 0,
        });
      }
    } catch (err: any) {
      console.error('Error fetching score:', err);
    }
  }, [user?.id]);

  // Claim a task
  const claimTask = useCallback(async (taskId: string): Promise<TaskAssignment | null> => {
    if (!user?.id) {
      toast.error('Please log in to claim tasks');
      return null;
    }

    // Check if user is blocked
    if (myScore?.is_soft_blocked) {
      toast.error('Your account is under review. Contact support.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('micro_task_assignments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          status: 'assigned',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already claimed this task');
        } else {
          throw error;
        }
        return null;
      }

      toast.success('Task claimed! Complete it within 30 minutes.');
      await fetchMyAssignments();
      return data as TaskAssignment;
    } catch (err: any) {
      console.error('Error claiming task:', err);
      toast.error('Failed to claim task');
      return null;
    }
  }, [user?.id, myScore?.is_soft_blocked, fetchMyAssignments]);

  // Submit task completion
  const submitTask = useCallback(async (
    assignmentId: string,
    taskId: string,
    submissionData: {
      audio_listened_percent?: number;
      selected_option_index?: number;
      media_url?: string;
      media_hash?: string;
      rating?: number;
      voice_note_url?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<TaskSubmission | null> => {
    if (!user?.id) {
      toast.error('Please log in');
      return null;
    }

    try {
      // Get task details for validation
      const { data: task } = await supabase
        .from('micro_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (!task) {
        toast.error('Task not found');
        return null;
      }

      // Calculate GPS distance if geo required
      let gpsDistance: number | null = null;
      if (task.geo_required && task.geo_lat && task.geo_lng) {
        if (!submissionData.latitude || !submissionData.longitude) {
          toast.error('Location required for this task');
          return null;
        }
        gpsDistance = haversineDistance(
          task.geo_lat,
          task.geo_lng,
          submissionData.latitude,
          submissionData.longitude
        );
      }

      const deviceHash = generateDeviceHash();

      // Insert submission
      const { data: submission, error } = await supabase
        .from('micro_task_submissions')
        .insert({
          assignment_id: assignmentId,
          task_id: taskId,
          user_id: user.id,
          audio_listened_percent: submissionData.audio_listened_percent,
          selected_option_index: submissionData.selected_option_index,
          media_url: submissionData.media_url,
          media_hash: submissionData.media_hash,
          rating: submissionData.rating,
          voice_note_url: submissionData.voice_note_url,
          submitted_lat: submissionData.latitude,
          submitted_lng: submissionData.longitude,
          gps_distance_km: gpsDistance,
          device_hash: deviceHash,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Update assignment status
      await supabase
        .from('micro_task_assignments')
        .update({ status: 'submitted' })
        .eq('id', assignmentId);

      // Call edge function for verification
      const { error: verifyError } = await supabase.functions.invoke('verify-micro-task', {
        body: { submissionId: submission.id }
      });

      if (verifyError) {
        console.error('Verification error:', verifyError);
      }

      toast.success('Task submitted! Verifying...');
      await fetchMyAssignments();
      await fetchMyScore();
      
      return submission as TaskSubmission;
    } catch (err: any) {
      console.error('Error submitting task:', err);
      toast.error('Failed to submit task');
      return null;
    }
  }, [user?.id, fetchMyAssignments, fetchMyScore]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTasks(),
        fetchMyAssignments(),
        fetchMyScore(),
      ]);
      setLoading(false);
    };

    if (user?.id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user?.id, fetchTasks, fetchMyAssignments, fetchMyScore]);

  return {
    tasks,
    myAssignments,
    myScore,
    loading,
    error,
    claimTask,
    submitTask,
    refresh: useCallback(() => {
      fetchTasks();
      fetchMyAssignments();
      fetchMyScore();
    }, [fetchTasks, fetchMyAssignments, fetchMyScore]),
  };
}
