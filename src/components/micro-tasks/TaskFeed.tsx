import { useState } from 'react';
import { useMicroTasks } from '@/hooks/useMicroTasks';
import { TaskCard } from './TaskCard';
import { TaskCompletionSheet } from './TaskCompletionSheet';
import { EarningsCard } from './EarningsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Headphones, Camera, Star, Wallet } from 'lucide-react';
import type { MicroTask, TaskAssignment } from '@/hooks/useMicroTasks';

export function TaskFeed() {
  const { tasks, myAssignments, myScore, loading, claimTask, submitTask, refresh } = useMicroTasks();
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<{ task: MicroTask; assignment: TaskAssignment } | null>(null);

  const handleClaim = async (taskId: string) => {
    setClaimingTaskId(taskId);
    const assignment = await claimTask(taskId);
    setClaimingTaskId(null);
    
    if (assignment) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setActiveTask({ task, assignment });
      }
    }
  };

  const audioTasks = tasks.filter(t => t.task_type === 'audio_listen');
  const photoTasks = tasks.filter(t => t.task_type === 'photo_verify');
  const rateTasks = tasks.filter(t => t.task_type === 'rate_service');

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Earnings Summary */}
      <EarningsCard 
        score={myScore} 
        pendingCount={myAssignments.filter(a => a.status === 'submitted').length}
      />

      {/* Task Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all" className="text-xs">
            <Wallet className="w-4 h-4 mr-1" />
            All ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="audio" className="text-xs">
            <Headphones className="w-4 h-4 mr-1" />
            Listen ({audioTasks.length})
          </TabsTrigger>
          <TabsTrigger value="photo" className="text-xs">
            <Camera className="w-4 h-4 mr-1" />
            Photo ({photoTasks.length})
          </TabsTrigger>
          <TabsTrigger value="rate" className="text-xs">
            <Star className="w-4 h-4 mr-1" />
            Rate ({rateTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tasks available right now</p>
              <p className="text-sm">Check back soon for new earning opportunities!</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onClaim={handleClaim}
                claiming={claimingTaskId === task.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="audio" className="mt-4 space-y-4">
          {audioTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClaim={handleClaim}
              claiming={claimingTaskId === task.id}
            />
          ))}
        </TabsContent>

        <TabsContent value="photo" className="mt-4 space-y-4">
          {photoTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClaim={handleClaim}
              claiming={claimingTaskId === task.id}
            />
          ))}
        </TabsContent>

        <TabsContent value="rate" className="mt-4 space-y-4">
          {rateTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClaim={handleClaim}
              claiming={claimingTaskId === task.id}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Task Completion Sheet */}
      {activeTask && (
        <TaskCompletionSheet
          task={activeTask.task}
          assignment={activeTask.assignment}
          onSubmit={submitTask}
          onClose={() => {
            setActiveTask(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
