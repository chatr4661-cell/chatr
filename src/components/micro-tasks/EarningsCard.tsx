import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IndianRupee, Coins, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UserTaskScore } from '@/hooks/useMicroTasks';

interface EarningsCardProps {
  score: UserTaskScore | null;
  pendingCount: number;
}

export function EarningsCard({ score, pendingCount }: EarningsCardProps) {
  const navigate = useNavigate();
  const canWithdraw = (score?.total_earned_rupees || 0) >= 50;

  return (
    <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-green-100 text-sm">Your Earnings</p>
            <div className="flex items-center gap-1 text-3xl font-bold">
              <IndianRupee className="w-6 h-6" />
              <span>{score?.total_earned_rupees?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-200">
              <Coins className="w-4 h-4" />
              <span className="font-semibold">{score?.total_earned_coins || 0}</span>
            </div>
            <p className="text-green-100 text-xs">coins earned</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
            <TrendingUp className="w-3 h-3 mr-1" />
            {score?.tasks_completed || 0} tasks done
          </Badge>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-amber-500/30 text-white hover:bg-amber-500/40">
              <Clock className="w-3 h-3 mr-1" />
              {pendingCount} pending
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            className={`flex-1 ${canWithdraw ? 'bg-white text-green-600 hover:bg-green-50' : 'bg-white/20 text-white'}`}
            disabled={!canWithdraw}
            onClick={() => navigate('/wallet')}
          >
            {canWithdraw ? (
              <>
                Withdraw via UPI <ArrowRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>₹{(50 - (score?.total_earned_rupees || 0)).toFixed(0)} more to withdraw</>
            )}
          </Button>
        </div>

        {!canWithdraw && (
          <p className="text-green-100 text-xs text-center mt-2">
            Minimum ₹50 required for instant UPI withdrawal
          </p>
        )}
      </CardContent>
    </Card>
  );
}
