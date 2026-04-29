import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, History, Shield } from 'lucide-react';
import { TaskFeed } from '@/components/micro-tasks/TaskFeed';
import { EarnExplainer } from '@/components/earn/EarnExplainer';
import { EarnShareBlock } from '@/components/earn/EarnShareBlock';
import { EarnLeaderboard } from '@/components/earn/EarnLeaderboard';
import { useUserRole } from '@/hooks/useUserRole';

export default function Earn() {
  const navigate = useNavigate();
  const { isAdmin, isCEO } = useUserRole();
  const canManage = isAdmin || isCEO;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 p-3 sm:p-4">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold sm:text-lg">Earn</h1>
              <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
                Real ₹ for tiny tasks. Invite friends, earn together.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/micro-tasks')} className="h-8 px-2">
                <Shield className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Manage</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/earn/history')} className="h-8 px-2">
              <History className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-3 pb-10 sm:p-4">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Main column: explainer + live mission feed */}
          <section className="space-y-4 min-w-0">
            <EarnExplainer />
            <TaskFeed />
          </section>

          {/* Side column: viral share + leaderboard */}
          <aside className="space-y-4">
            <EarnShareBlock />
            <EarnLeaderboard />
          </aside>
        </div>
      </main>
    </div>
  );
}
