import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, Loader2, Sparkles, Mail, Linkedin, CheckCircle2, Clock } from "lucide-react";

type Lead = {
  id: string; full_name: string; company: string | null; role_title: string | null;
  email: string | null; linkedin_url: string | null; location: string | null;
  industry: string | null; icp_match_score: number; status: string; created_at: string;
};

type Outreach = {
  id: string; lead_id: string; channel: string; subject: string | null;
  message_body: string; status: string; sequence_step: number;
};

export function SalesAgentPanel({ disabled }: { disabled?: boolean }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [generating, setGenerating] = useState(false);
  const [icp, setIcp] = useState("");
  const [count, setCount] = useState(5);

  const load = async () => {
    const [{ data: l }, { data: o }] = await Promise.all([
      supabase.from("cc_leads").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("cc_outreach").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setLeads((l || []) as Lead[]);
    setOutreach((o || []) as Outreach[]);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("cc-sales")
      .on("postgres_changes", { event: "*", schema: "public", table: "cc_leads" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cc_outreach" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const generate = async () => {
    if (disabled) { toast.error("Emergency STOP active."); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("cc-sales-agent", {
        body: { icp: icp.trim() || undefined, count },
      });
      if (error) throw error;
      toast.success(`Sales Agent generated ${data?.leads?.length || 0} leads`);
      setIcp("");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const approveOutreach = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cc_outreach").update({
      status: "approved", approved_by: user?.id, approved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Outreach approved");
  };

  const markSent = async (id: string) => {
    const { error } = await supabase.from("cc_outreach").update({
      status: "sent", sent_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Marked as sent");
  };

  const updateLeadStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("cc_leads").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const pendingApproval = outreach.filter(o => o.status === "draft");

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Sales Agent
          <Badge variant="secondary" className="ml-2">{leads.length} leads</Badge>
          {pendingApproval.length > 0 && (
            <Badge variant="default" className="ml-1">{pendingApproval.length} drafts</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Optional ICP (e.g., 'Indian D2C founders ₹1-10cr ARR')"
            value={icp}
            onChange={(e) => setIcp(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 5)))}
              className="w-24"
            />
            <Button onClick={generate} disabled={generating || disabled} className="flex-1">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Leads
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[420px] pr-3">
          {leads.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No leads yet. Generate your first batch above.
            </div>
          )}
          <div className="space-y-3">
            {leads.map(lead => {
              const leadOutreach = outreach.filter(o => o.lead_id === lead.id);
              return (
                <div key={lead.id} className="border rounded-lg p-3 bg-background/50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold">{lead.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {lead.role_title}{lead.company ? ` · ${lead.company}` : ""}{lead.location ? ` · ${lead.location}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-[10px]">{lead.icp_match_score}% match</Badge>
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        className="text-xs bg-transparent border rounded px-1 py-0.5"
                      >
                        <option value="new">new</option>
                        <option value="contacted">contacted</option>
                        <option value="replied">replied</option>
                        <option value="qualified">qualified</option>
                        <option value="converted">converted</option>
                        <option value="lost">lost</option>
                      </select>
                    </div>
                  </div>

                  {leadOutreach.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {leadOutreach.map(o => (
                        <div key={o.id} className="border-l-2 border-primary/40 pl-2 py-1">
                          <div className="flex items-center gap-2 mb-1">
                            {o.channel === "linkedin" ? <Linkedin className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{o.channel}</span>
                            <Badge variant={o.status === "sent" ? "default" : o.status === "approved" ? "secondary" : "outline"} className="text-[9px]">
                              {o.status}
                            </Badge>
                          </div>
                          {o.subject && <div className="text-xs font-medium">{o.subject}</div>}
                          <div className="text-xs text-muted-foreground whitespace-pre-wrap">{o.message_body}</div>
                          <div className="flex gap-1 mt-1.5">
                            {o.status === "draft" && (
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => approveOutreach(o.id)}>
                                <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                              </Button>
                            )}
                            {o.status === "approved" && (
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => markSent(o.id)}>
                                <Clock className="h-3 w-3 mr-1" />Mark Sent
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
