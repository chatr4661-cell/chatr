import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Headphones, Camera, Star, MapPin, Coins, IndianRupee } from 'lucide-react';
import type { MicroTask } from '@/hooks/useMicroTasks';

interface TaskCardProps {
  task: MicroTask;
  onClaim: (taskId: string) => void;
  claiming?: boolean;
}

const taskIcons = {
  audio_listen: Headphones,
  photo_verify: Camera,
  rate_service: Star,
};

const taskTypeLabels = {
  audio_listen: 'Listen & Earn',
  photo_verify: 'Photo Verify',
  rate_service: 'Rate & Earn',
};

const taskTypeColors = {
  audio_listen: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  photo_verify: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  rate_service: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

export function TaskCard({ task, onClaim, claiming }: TaskCardProps) {
  const Icon = taskIcons[task.task_type];
  const spotsLeft = task.max_completions - task.current_completions;
  const isLimitedSpots = spotsLeft <= 20;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${taskTypeColors[task.task_type]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <Badge variant="outline" className={taskTypeColors[task.task_type]}>
                {taskTypeLabels[task.task_type]}
              </Badge>
            </div>
          </div>
          {task.geo_required && (
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {task.geo_radius_km}km
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg mt-2">{task.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {task.description}
        </p>

        {/* Reward display */}
        <div className="flex items-center justify-between bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-green-600 font-bold">
              <IndianRupee className="w-4 h-4" />
              <span className="text-xl">{task.reward_rupees}</span>
            </div>
            <div className="flex items-center gap-1 text-amber-600 text-sm">
              <Coins className="w-4 h-4" />
              <span>{task.reward_coins} coins</span>
            </div>
          </div>
          {isLimitedSpots && (
            <Badge variant="destructive" className="animate-pulse">
              {spotsLeft} spots left!
            </Badge>
          )}
        </div>

        {/* Task-specific info */}
        {task.task_type === 'audio_listen' && task.audio_duration_seconds && (
          <p className="text-xs text-muted-foreground">
            🎧 {task.audio_duration_seconds} seconds audio
          </p>
        )}

        <Button 
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          onClick={() => onClaim(task.id)}
          disabled={claiming}
        >
          {claiming ? 'Claiming...' : `Earn ₹${task.reward_rupees}`}
        </Button>
      </CardContent>
    </Card>
  );
}
