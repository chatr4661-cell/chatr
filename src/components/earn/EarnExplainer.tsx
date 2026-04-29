import { Card, CardContent } from '@/components/ui/card';
import { MousePointerClick, CheckCircle2, Wallet } from 'lucide-react';

const STEPS = [
  { icon: MousePointerClick, title: 'Pick a mission', desc: 'Listen, snap, or rate. Takes <60s.' },
  { icon: CheckCircle2, title: 'Submit proof', desc: 'Auto-verified by AI in seconds.' },
  { icon: Wallet, title: 'Get paid', desc: 'Coins land instantly. Cash out via UPI.' },
];

export function EarnExplainer() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="grid grid-cols-3 gap-2 p-3 sm:gap-4 sm:p-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex flex-col items-start gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {i + 1}
                </div>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-xs font-semibold sm:text-sm">{step.title}</div>
                <div className="text-[10px] leading-tight text-muted-foreground sm:text-xs">{step.desc}</div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
