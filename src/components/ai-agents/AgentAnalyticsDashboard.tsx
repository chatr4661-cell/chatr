import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export function AgentAnalyticsDashboard({ agentId }: { agentId: string }) {
  const { data: analytics } = useQuery({
    queryKey: ["agent-analytics", agentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_agent_analytics")
        .select("*")
        .eq("agent_id", agentId)
        .order("date", { ascending: true });
      return data || [];
    }
  });

  const { data: agent } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("id", agentId)
        .single();
      return data;
    }
  });

  const totalMessages = analytics?.reduce((sum, day) => sum + (day.messages_sent || 0), 0) || 0;
  const totalConversations = analytics?.reduce((sum, day) => sum + (day.conversations_started || 0), 0) || 0;
  const avgResponseTime = analytics?.reduce((sum, day) => sum + (day.average_response_time_seconds || 0), 0) / (analytics?.length || 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalMessages}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalConversations}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{avgResponseTime.toFixed(1)}s</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="messages_sent" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversations Started</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="conversations_started" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
