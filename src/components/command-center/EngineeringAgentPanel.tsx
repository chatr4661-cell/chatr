import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, Loader2, Sparkles, Copy, ChevronDown, ChevronUp, CheckCircle2, Play } from "lucide-react";

type DevTask = {
  id: string; title: string; description: string | null; task_type: string;
  priority: string; status: string; estimated_hours: number | null;
  feature_spec: string | null; api_plan: string | null; lovable_prompt: string | null;
  created_at: string;
};

const priorityColor = (p: string) => p === "high" ? "destructive" : p === "medium" ? "default" : "secondary";
const statusColor = (s: string) => s === "done" ? "secondary" : s === "in_progress" ? "default" : "outline";

export function EngineeringAgentPanel({ disabled }: { disabled?: boolean }) {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [brief, setBrief] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    const { data } = await supabase.from("cc_dev_tasks").select("*").order("created_at", { ascending: false }).limit(50);
    setTasks((data || []) as DevTask[]);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("cc-dev")
      .on("postgres_changes", { event: "*", schema: "public", table: "cc_dev_tasks" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const generate = async () => {
    if (disabled) { toast.error("Emergency STOP active."); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("cc-engineering-agent", {
        body: { brief: brief.trim() || undefined },
      });
      if (error) throw error;
      toast.success(`Engineering Agent generated ${data?.tasks?.length || 0} tasks`);
      setBrief("");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "done") updates.completed_at = new Date().toISOString();
    const { error } = await supabase.from("cc_dev_tasks").update(updates).eq("id", id);
    if (error) toast.error(error.message); else toast.success(`Marked ${status}`);
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const pending = tasks.filter(t => t.status === "pending").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const done = tasks.filter(t => t.status === "done").length;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Zap className="h-5 w-5 text-primary" />
          Engineering Agent
          <Badge variant="outline" className="ml-2">{pending} pending</Badge>
          <Badge variant="default">{inProgress} in progress</Badge>
          <Badge variant="secondary">{done} done</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Optional brief (e.g., 'Build a referral leaderboard with weekly resets')"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <Button onClick={generate} disabled={generating || disabled} className="w-full">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Dev Tasks
          </Button>
        </div>

        <ScrollArea className="h-[420px] pr-3">
          {tasks.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No dev tasks yet. Generate a batch above.
            </div>
          )}
          <div className="space-y-3">
            {tasks.map(t => {
              const isOpen = expanded[t.id];
              return (
                <div key={t.id} className="border rounded-lg p-3 bg-background/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge variant={priorityColor(t.priority) as any} className="text-[9px]">{t.priority}</Badge>
                        <Badge variant={statusColor(t.status) as any} className="text-[9px]">{t.status}</Badge>
                        <Badge variant="outline" className="text-[9px]">{t.task_type}</Badge>
                        {t.estimated_hours && <span className="text-[10px] text-muted-foreground">~{t.estimated_hours}h</span>}
                      </div>
                      <div className="font-semibold text-sm">{t.title}</div>
                      {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpanded(prev => ({ ...prev, [t.id]: !prev[t.id] }))}>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="mt-3 space-y-3 pt-3 border-t">
                      {t.feature_spec && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Spec</div>
                          <div className="text-xs whitespace-pre-wrap">{t.feature_spec}</div>
                        </div>
                      )}
                      {t.api_plan && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">API Plan</div>
                          <div className="text-xs whitespace-pre-wrap">{t.api_plan}</div>
                        </div>
                      )}
                      {t.lovable_prompt && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lovable Prompt</div>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyPrompt(t.lovable_prompt!)}>
                              <Copy className="h-3 w-3 mr-1" />Copy
                            </Button>
                          </div>
                          <div className="text-xs whitespace-pre-wrap bg-muted/50 p-2 rounded font-mono">{t.lovable_prompt}</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-1 mt-2 pt-2 border-t">
                    {t.status === "pending" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(t.id, "in_progress")}>
                        <Play className="h-3 w-3 mr-1" />Start
                      </Button>
                    )}
                    {t.status !== "done" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(t.id, "done")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
