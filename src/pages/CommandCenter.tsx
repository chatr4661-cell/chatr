import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import {
  Crown, Sparkles, ShieldAlert, CheckCircle2, XCircle, Activity,
  TrendingUp, Users, Target, DollarSign, Loader2, Zap, Brain
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { RevenuePipelineWidget } from "@/components/command-center/RevenuePipelineWidget";
import { SalesAgentPanel } from "@/components/command-center/SalesAgentPanel";
import { EngineeringAgentPanel } from "@/components/command-center/EngineeringAgentPanel";

type Plan = {
  id: string; title: string; description: string | null;
  department: string; impact_level: "low" | "medium" | "high";
  status: string; generated_by: string; payload: any;
  created_at: string; decided_at: string | null;
};

type LogRow = {
  id: string; agent: string; action: string; level: string;
  details: any; created_at: string;
};

const impactColor = (lvl: string) =>
  lvl === "high" ? "destructive" : lvl === "medium" ? "default" : "secondary";

const deptIcon = (d: string) => {
  switch (d) {
    case "engineering": return <Zap className="h-4 w-4" />;
    case "sales": return <Target className="h-4 w-4" />;
    case "marketing": return <TrendingUp className="h-4 w-4" />;
    case "finance": return <DollarSign className="h-4 w-4" />;
    default: return <Brain className="h-4 w-4" />;
  }
};

export default function CommandCenter() {
  const { isCEO, loading: roleLoading } = useUserRole();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [goal, setGoal] = useState("");
  const [emergencyStop, setEmergencyStop] = useState(false);

  const loadAll = async () => {
    const [{ data: p }, { data: l }] = await Promise.all([
      supabase.from("cc_plans").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("cc_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setPlans((p || []) as Plan[]);
    setLogs((l || []) as LogRow[]);
  };

  useEffect(() => {
    if (!isCEO) return;
    loadAll();
    const ch = supabase
      .channel("cc-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "cc_plans" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cc_logs" }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isCEO]);

  if (roleLoading) {
    return <div className="min-h-screen grid place-items-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  if (!isCEO) return <Navigate to="/" replace />;

  const generatePlan = async () => {
    if (emergencyStop) { toast.error("Emergency STOP active. Disable to resume AI."); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("cc-ai-ceo", {
        body: { goal: goal.trim() || undefined },
      });
      if (error) throw error;
      toast.success(`AI CEO generated: ${data?.plan?.title || "new plan"}`);
      setGoal("");
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const decide = async (plan: Plan, decision: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("cc_plans").update({
      status: decision, decided_at: new Date().toISOString(), decided_by: user.id,
    }).eq("id", plan.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("cc_approvals").insert({
      plan_id: plan.id, decision, decided_by: user.id,
    });
    await supabase.from("cc_logs").insert({
      agent: "ceo", action: `${decision === "approved" ? "Approved" : "Rejected"}: ${plan.title}`,
      level: decision === "approved" ? "success" : "warn", plan_id: plan.id,
    });
    toast.success(`Plan ${decision}`);
  };

  const pending = plans.filter(p => p.status === "pending");
  const approved = plans.filter(p => p.status === "approved");
  const rejected = plans.filter(p => p.status === "rejected");

  // Quick metrics from plans
  const todayCount = plans.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).length;
  const highImpactCount = plans.filter(p => p.impact_level === "high").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Helmet>
        <title>AI Command Center | CHATR</title>
        <meta name="description" content="AI-powered company operating layer with CEO approval workflow" />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-background/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 grid place-items-center shadow-lg shadow-primary/20">
              <Crown className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI Command Center</h1>
              <p className="text-xs text-muted-foreground">Founder console · Real CEO has final authority</p>
            </div>
          </div>
          <Button
            variant={emergencyStop ? "default" : "destructive"}
            size="sm"
            onClick={() => {
              setEmergencyStop(v => !v);
              toast.warning(emergencyStop ? "AI execution resumed" : "🛑 Emergency STOP engaged");
            }}
          >
            <ShieldAlert className="h-4 w-4 mr-2" />
            {emergencyStop ? "Resume AI" : "Emergency STOP"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Overview metrics */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={<Sparkles className="h-4 w-4" />} label="Plans Today" value={todayCount} />
          <MetricCard icon={<ShieldAlert className="h-4 w-4" />} label="Awaiting Approval" value={pending.length} highlight={pending.length > 0} />
          <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={approved.length} />
          <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="High Impact" value={highImpactCount} />
        </section>

        {/* AI CEO planner */}
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI CEO Planner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Optional: give the AI CEO a goal (e.g., 'Get 100 paying customers this month'). Leave blank for an autonomous plan."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button onClick={generatePlan} disabled={generating || emergencyStop} size="lg">
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="queue">Queue ({pending.length})</TabsTrigger>
            <TabsTrigger value="all">All Plans</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-3 mt-4">
            {pending.length === 0 && <EmptyState text="No plans awaiting your approval. Generate one above." />}
            {pending.map(p => <PlanCard key={p.id} plan={p} onApprove={() => decide(p, "approved")} onReject={() => decide(p, "rejected")} />)}
          </TabsContent>

          <TabsContent value="all" className="space-y-3 mt-4">
            {plans.length === 0 && <EmptyState text="No plans yet." />}
            {plans.map(p => <PlanCard key={p.id} plan={p} onApprove={() => decide(p, "approved")} onReject={() => decide(p, "rejected")} />)}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" />Live Activity</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {logs.length === 0 && <EmptyState text="No activity yet." />}
                  <div className="space-y-2">
                    {logs.map(l => (
                      <div key={l.id} className="flex items-start gap-3 text-sm border-l-2 border-primary/30 pl-3 py-1">
                        <div className={`h-2 w-2 rounded-full mt-1.5 ${l.level === "error" ? "bg-destructive" : l.level === "warn" ? "bg-yellow-500" : l.level === "success" ? "bg-green-500" : "bg-muted-foreground"}`} />
                        <div className="flex-1">
                          <div className="font-medium">{l.action}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.agent} · {new Date(l.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/40 shadow-md shadow-primary/10" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2 text-muted-foreground">
          {icon}
          <span className="text-xs uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function PlanCard({ plan, onApprove, onReject }: { plan: Plan; onApprove: () => void; onReject: () => void }) {
  const tasks = (plan.payload?.tasks as any[]) || [];
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="gap-1">{deptIcon(plan.department)}{plan.department}</Badge>
              <Badge variant={impactColor(plan.impact_level) as any}>{plan.impact_level} impact</Badge>
              <Badge variant="secondary">{plan.status}</Badge>
            </div>
            <h3 className="font-semibold text-lg">{plan.title}</h3>
            {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Tasks ({tasks.length})</div>
            <ul className="space-y-1.5">
              {tasks.slice(0, 5).map((t, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span><span className="font-medium">{t.title}</span>{t.description ? <span className="text-muted-foreground"> — {t.description}</span> : null}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.status === "pending" && (
          <div className="flex gap-2 mt-4 pt-3 border-t">
            <Button onClick={onApprove} size="sm" className="flex-1"><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
            <Button onClick={onReject} size="sm" variant="outline" className="flex-1"><XCircle className="h-4 w-4 mr-1" />Reject</Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-3">
          {new Date(plan.created_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-12 text-muted-foreground text-sm">{text}</div>;
}
