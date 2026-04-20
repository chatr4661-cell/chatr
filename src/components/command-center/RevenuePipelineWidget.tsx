import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, MessageSquare, Trophy, DollarSign } from "lucide-react";

interface PipelineStats {
  leads: number;
  outreach: number;
  replied: number;
  qualified: number;
  closed: number;
  revenue: number;
}

export function RevenuePipelineWidget({ stats }: { stats: PipelineStats }) {
  const stages = [
    { label: "Leads", value: stats.leads, icon: Users, color: "from-blue-500/20 to-blue-500/5" },
    { label: "Outreach", value: stats.outreach, icon: MessageSquare, color: "from-purple-500/20 to-purple-500/5" },
    { label: "Replies", value: stats.replied, icon: TrendingUp, color: "from-amber-500/20 to-amber-500/5" },
    { label: "Qualified", value: stats.qualified, icon: Trophy, color: "from-orange-500/20 to-orange-500/5" },
    { label: "Closed", value: stats.closed, icon: DollarSign, color: "from-green-500/20 to-green-500/5" },
  ];
  const conversionRate = stats.leads > 0 ? ((stats.closed / stats.leads) * 100).toFixed(1) : "0.0";

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Revenue Pipeline
          </span>
          <div className="text-right">
            <div className="text-2xl font-bold">₹{stats.revenue.toLocaleString("en-IN")}</div>
            <div className="text-xs text-muted-foreground">Lifetime · {conversionRate}% conversion</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {stages.map((s) => (
            <div key={s.label} className={`rounded-lg p-3 bg-gradient-to-br ${s.color} border border-border/40`}>
              <s.icon className="h-4 w-4 text-muted-foreground mb-2" />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
