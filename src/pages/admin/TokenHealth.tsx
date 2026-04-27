import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, RefreshCw, ShieldOff, Smartphone, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProblemUser {
  user_id: string;
  username: string | null;
  phone_number: string | null;
  token_count: number;
  last_token_used_at: string | null;
  has_valid_token: boolean;
  last_error: string | null;
  consecutive_failures: number | null;
  failed_digest_count: number;
  last_failure: string | null;
}

interface Diagnostics {
  summary: {
    users_with_no_token: number;
    users_with_invalid_flag: number;
    users_with_failed_digests: number;
    total_failed_notifications: number;
  };
  problem_users: ProblemUser[];
}

export default function TokenHealth() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data: rpc, error } = await supabase.rpc("get_push_token_diagnostics" as any);
    if (error) {
      toast({ title: "Failed to load diagnostics", description: error.message, variant: "destructive" });
    } else {
      setData(rpc as unknown as Diagnostics);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetFlag = async (userId: string) => {
    const { error } = await supabase
      .from("user_push_health" as any)
      .upsert({ user_id: userId, has_valid_token: true, consecutive_failures: 0, last_error: null, last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User unblocked", description: "Future digests will be attempted again." });
      load();
    }
  };

  const filtered = (data?.problem_users ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.username ?? "").toLowerCase().includes(q) || (u.phone_number ?? "").includes(q) || u.user_id.includes(q);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Push Token Diagnostics</h1>
          <p className="text-sm text-muted-foreground">Users with missing or invalid FCM tokens are excluded from retries automatically.</p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard icon={<Smartphone className="h-4 w-4" />} label="No tokens" value={data?.summary.users_with_no_token ?? 0} />
        <SummaryCard icon={<ShieldOff className="h-4 w-4" />} label="Flagged invalid" value={data?.summary.users_with_invalid_flag ?? 0} accent="destructive" />
        <SummaryCard icon={<XCircle className="h-4 w-4" />} label="Failed digests" value={data?.summary.users_with_failed_digests ?? 0} />
        <SummaryCard icon={<AlertCircle className="h-4 w-4" />} label="Total failures" value={data?.summary.total_failed_notifications ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Problem users</CardTitle>
          <Input placeholder="Search by name, phone or user id…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mt-2" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Failed digests</TableHead>
                  <TableHead>Last error</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No problem users 🎉</TableCell></TableRow>
                )}
                {filtered.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="font-medium">{u.username ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.phone_number ?? u.user_id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell>{u.token_count}</TableCell>
                    <TableCell>
                      {u.token_count === 0 ? (
                        <Badge variant="secondary">No token</Badge>
                      ) : !u.has_valid_token ? (
                        <Badge variant="destructive">Invalid (skipped)</Badge>
                      ) : (
                        <Badge>Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>{u.failed_digest_count}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{u.last_error ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {!u.has_valid_token && (
                        <Button size="sm" variant="outline" onClick={() => resetFlag(u.user_id)}>Reset</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: "destructive" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">{icon}{label}</span>
        </div>
        <div className={`text-3xl font-bold mt-2 ${accent === "destructive" ? "text-destructive" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
