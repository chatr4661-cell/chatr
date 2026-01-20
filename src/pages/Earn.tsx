import { TaskFeed } from '@/components/micro-tasks/TaskFeed';
import { Button } from '@/components/ui/button';
import { ArrowLeft, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Earn() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Earn Money</h1>
              <p className="text-xs text-muted-foreground">Complete tasks, get paid instantly</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/earn/history')}>
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
        </div>
      </header>

      {/* Task Feed */}
      <TaskFeed />
    </div>
  );
}
