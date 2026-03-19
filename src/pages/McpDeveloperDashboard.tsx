/**
 * MCP Developer Dashboard
 * Full-featured console for managing API keys, webhooks, analytics, and documentation
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft, Key, Plus, Trash2, Copy, Eye, EyeOff,
  Activity, Webhook, BookOpen, BarChart3, Shield,
  CheckCircle, XCircle, Clock, Zap, Globe, Code2, Terminal
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  generateApiKey, listApiKeys, revokeApiKey, deleteApiKey,
  getRequestLogs, MCP_TOOLS, MCP_PERMISSIONS,
  type McpApiKey, type McpRequestLog,
} from '@/services/mcpService';
import {
  createWebhook, listWebhooks, deleteWebhook, toggleWebhook,
  MCP_WEBHOOK_EVENTS, type McpWebhook,
} from '@/services/mcpWebhookService';

const McpDeveloperDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('keys');

  // API Keys state
  const [apiKeys, setApiKeys] = useState<McpApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDesc, setNewKeyDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(true);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<McpWebhook[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookKeyId, setNewWebhookKeyId] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  // Logs state
  const [logs, setLogs] = useState<McpRequestLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoadingKeys(true);
      const [keys, hooks] = await Promise.all([
        listApiKeys(),
        listWebhooks(),
      ]);
      setApiKeys(keys);
      setWebhooks(hooks);
    } catch (err) {
      console.error('Failed to load MCP data:', err);
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('App name is required');
      return;
    }
    try {
      const { apiKey, record } = await generateApiKey(newKeyName, newKeyDesc, selectedPermissions.length > 0 ? selectedPermissions : undefined);
      setGeneratedKey(apiKey);
      setShowKey(true);
      setApiKeys(prev => [record, ...prev]);
      setNewKeyName('');
      setNewKeyDesc('');
      setSelectedPermissions([]);
      toast.success('API key generated!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await revokeApiKey(id);
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k));
      toast.success('Key revoked');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await deleteApiKey(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast.success('Key deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookUrl || !newWebhookKeyId || selectedEvents.length === 0) {
      toast.error('URL, API key, and at least one event required');
      return;
    }
    try {
      const hook = await createWebhook(newWebhookKeyId, newWebhookUrl, selectedEvents);
      setWebhooks(prev => [hook, ...prev]);
      setNewWebhookUrl('');
      setSelectedEvents([]);
      toast.success('Webhook created!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleLoadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await getRequestLogs(100);
      setLogs(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') handleLoadLogs();
  }, [activeTab]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Analytics computed values
  const totalRequests = logs.length;
  const successRate = totalRequests > 0
    ? ((logs.filter(l => l.response_status === 'success').length / totalRequests) * 100).toFixed(1)
    : '0';
  const avgLatency = totalRequests > 0
    ? (logs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / totalRequests).toFixed(0)
    : '0';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">MCP Developer Console</h1>
            <p className="text-xs text-muted-foreground">Machine Communication Protocol</p>
          </div>
          <Badge variant="outline" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            v1.0
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-2">
          <TabsList className="w-full grid grid-cols-5 h-9">
            <TabsTrigger value="keys" className="text-xs"><Key className="h-3 w-3 mr-1" />Keys</TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs"><Webhook className="h-3 w-3 mr-1" />Hooks</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs"><BarChart3 className="h-3 w-3 mr-1" />Stats</TabsTrigger>
            <TabsTrigger value="test" className="text-xs"><Terminal className="h-3 w-3 mr-1" />Test</TabsTrigger>
            <TabsTrigger value="docs" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />Docs</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="h-[calc(100vh-120px)]">
          {/* ═══ API KEYS TAB ═══ */}
          <TabsContent value="keys" className="px-4 pb-6 space-y-4">
            {/* Generated key banner */}
            {generatedKey && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-medium text-primary">🔑 New API Key Generated</p>
                    <p className="text-xs text-muted-foreground">Copy this key now — it won't be shown again!</p>
                    <div className="flex gap-2">
                      <Input
                        value={showKey ? generatedKey : '••••••••••••••••••••'}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button size="icon" variant="outline" onClick={() => setShowKey(!showKey)}>
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setGeneratedKey(null)} className="text-xs">
                      Dismiss
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Create new key */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Generate New API Key
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="App name (e.g., My CRM Bot)"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newKeyDesc}
                  onChange={e => setNewKeyDesc(e.target.value)}
                  rows={2}
                />
                <div>
                  <p className="text-xs font-medium mb-2">Permissions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MCP_PERMISSIONS.map(perm => (
                      <label key={perm.value} className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={selectedPermissions.includes(perm.value)}
                          onCheckedChange={(checked) => {
                            setSelectedPermissions(prev =>
                              checked
                                ? [...prev, perm.value]
                                : prev.filter(p => p !== perm.value)
                            );
                          }}
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={handleGenerateKey} className="w-full">
                  <Key className="h-4 w-4 mr-2" />
                  Generate Key
                </Button>
              </CardContent>
            </Card>

            {/* Existing keys */}
            {loadingKeys ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading keys...</div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No API keys yet</div>
            ) : (
              apiKeys.map(key => (
                <Card key={key.id} className={!key.is_active ? 'opacity-60' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{key.app_name}</p>
                        <p className="text-xs text-muted-foreground">{key.app_description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{key.api_key_prefix}••••</code>
                          <Badge variant={key.is_active ? 'default' : 'destructive'} className="text-[10px]">
                            {key.is_active ? 'Active' : 'Revoked'}
                          </Badge>
                        </div>
                        <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>{key.request_count} requests</span>
                          <span>{key.rate_limit_per_minute}/min limit</span>
                          {key.last_used_at && (
                            <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {key.is_active && (
                          <Button size="icon" variant="ghost" onClick={() => handleRevokeKey(key.id)}>
                            <Shield className="h-4 w-4 text-amber-500" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteKey(key.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {key.permissions?.map(p => (
                        <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ═══ WEBHOOKS TAB ═══ */}
          <TabsContent value="webhooks" className="px-4 pb-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Create Webhook
                </CardTitle>
                <CardDescription className="text-xs">Receive real-time events via HTTP POST</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Webhook URL (https://...)"
                  value={newWebhookUrl}
                  onChange={e => setNewWebhookUrl(e.target.value)}
                />
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={newWebhookKeyId}
                  onChange={e => setNewWebhookKeyId(e.target.value)}
                >
                  <option value="">Select API Key</option>
                  {apiKeys.filter(k => k.is_active).map(k => (
                    <option key={k.id} value={k.id}>{k.app_name} ({k.api_key_prefix}••••)</option>
                  ))}
                </select>
                <div>
                  <p className="text-xs font-medium mb-2">Events</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MCP_WEBHOOK_EVENTS.map(evt => (
                      <label key={evt.value} className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={selectedEvents.includes(evt.value)}
                          onCheckedChange={(checked) => {
                            setSelectedEvents(prev =>
                              checked ? [...prev, evt.value] : prev.filter(e => e !== evt.value)
                            );
                          }}
                        />
                        {evt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreateWebhook} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webhook
                </Button>
              </CardContent>
            </Card>

            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No webhooks configured</div>
            ) : (
              webhooks.map(hook => (
                <Card key={hook.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono truncate">{hook.webhook_url}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={hook.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {hook.is_active ? 'Active' : 'Paused'}
                          </Badge>
                          {hook.failure_count > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {hook.failure_count} failures
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {hook.events?.map(e => (
                            <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Switch
                          checked={hook.is_active}
                          onCheckedChange={(checked) => {
                            toggleWebhook(hook.id, checked);
                            setWebhooks(prev => prev.map(h => h.id === hook.id ? { ...h, is_active: checked } : h));
                          }}
                        />
                        <Button size="icon" variant="ghost" onClick={() => {
                          deleteWebhook(hook.id);
                          setWebhooks(prev => prev.filter(h => h.id !== hook.id));
                          toast.success('Webhook deleted');
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ═══ ANALYTICS TAB ═══ */}
          <TabsContent value="analytics" className="px-4 pb-6 space-y-4">
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Activity className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-xl font-bold">{totalRequests}</p>
                  <p className="text-[10px] text-muted-foreground">Total Requests</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <p className="text-xl font-bold">{successRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Success Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                  <p className="text-xl font-bold">{avgLatency}ms</p>
                  <p className="text-[10px] text-muted-foreground">Avg Latency</p>
                </CardContent>
              </Card>
            </div>

            {/* API Keys overview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">API Key Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {apiKeys.map(key => (
                  <div key={key.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{key.app_name}</p>
                      <p className="text-[10px] text-muted-foreground">{key.api_key_prefix}••••</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{key.request_count}</p>
                      <p className="text-[10px] text-muted-foreground">requests</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Request logs */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Recent Requests</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleLoadLogs} className="text-xs h-7">
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No requests logged yet</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {logs.slice(0, 50).map(log => (
                      <div key={log.id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                        {log.response_status === 'success'
                          ? <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                          : <XCircle className="h-3 w-3 text-destructive shrink-0" />
                        }
                        <span className="text-xs font-mono flex-1 truncate">{log.tool_name}</span>
                        <span className="text-[10px] text-muted-foreground">{log.latency_ms}ms</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TEST TAB ═══ */}
          <TabsContent value="test" className="px-4 pb-6">
            <McpTestConsole />
          </TabsContent>

          {/* ═══ DOCS TAB ═══ */}
          <TabsContent value="docs" className="px-4 pb-6">
            <McpDocumentation />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// TEST CONSOLE COMPONENT
// ═══════════════════════════════════════════════════════

function McpTestConsole() {
  const [selectedTool, setSelectedTool] = useState('');
  const [inputJson, setInputJson] = useState('{}');
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allTools = Object.values(MCP_TOOLS).flat();

  const handleTest = async () => {
    if (!selectedTool) {
      toast.error('Select a tool');
      return;
    }
    setLoading(true);
    setOutput(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const mcpEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatr-mcp-server`;

      const response = await fetch(mcpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: selectedTool,
            arguments: JSON.parse(inputJson),
          },
          id: crypto.randomUUID(),
        }),
      });

      const result = await response.json();
      setOutput(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setOutput(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Tool Tester
          </CardTitle>
          <CardDescription className="text-xs">Test MCP tools with your auth session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedTool}
            onChange={e => setSelectedTool(e.target.value)}
          >
            <option value="">Select a tool...</option>
            {Object.entries(MCP_TOOLS).map(([category, tools]) => (
              <optgroup key={category} label={category.toUpperCase()}>
                {tools.map(tool => (
                  <option key={tool.name} value={tool.name}>{tool.name} — {tool.description}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <Textarea
            placeholder='{"conversation_id": "..."}'
            value={inputJson}
            onChange={e => setInputJson(e.target.value)}
            className="font-mono text-xs"
            rows={4}
          />

          <Button onClick={handleTest} disabled={loading} className="w-full">
            {loading ? 'Running...' : 'Execute Tool'}
          </Button>

          {output && (
            <div className="relative">
              <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                {output}
              </pre>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => navigator.clipboard.writeText(output)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DOCUMENTATION COMPONENT
// ═══════════════════════════════════════════════════════

function McpDocumentation() {
  const mcpEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatr-mcp-server`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  return (
    <div className="space-y-4">
      {/* Quick Start */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium mb-1">Endpoint</p>
            <div className="flex gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{mcpEndpoint}</code>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(mcpEndpoint)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-1">Authentication</p>
            <div className="space-y-2">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-1">API Key (for external apps)</p>
                <code className="text-xs font-mono">x-mcp-api-key: cmcp_your_key_here</code>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-1">JWT (for authenticated users)</p>
                <code className="text-xs font-mono">Authorization: Bearer your_jwt_token</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Request */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Example: Send Message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">{`curl -X POST ${mcpEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -H "x-mcp-api-key: cmcp_your_key" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "messaging_send",
      "arguments": {
        "conversation_id": "uuid",
        "content": "Hello from MCP!"
      }
    },
    "id": "1"
  }'`}</pre>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(`curl -X POST ${mcpEndpoint} -H "Content-Type: application/json" -H "x-mcp-api-key: cmcp_your_key" -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"messaging_send","arguments":{"conversation_id":"uuid","content":"Hello"}},"id":"1"}'`)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Tools */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Available Tools ({Object.values(MCP_TOOLS).flat().length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(MCP_TOOLS).map(([category, tools]) => (
            <div key={category}>
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">{category}</p>
              <div className="space-y-1">
                {tools.map(tool => (
                  <div key={tool.name} className="flex items-center gap-2 py-1">
                    <code className="text-xs font-mono text-primary">{tool.name}</code>
                    <span className="text-[10px] text-muted-foreground">— {tool.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Webhook Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhook Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {MCP_WEBHOOK_EVENTS.map(evt => (
              <div key={evt.value} className="flex items-center gap-2 py-1">
                <code className="text-xs font-mono text-primary">{evt.value}</code>
                <Badge variant="outline" className="text-[10px]">{evt.category}</Badge>
                <span className="text-[10px] text-muted-foreground">— {evt.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {MCP_PERMISSIONS.map(perm => (
              <div key={perm.value} className="flex items-center gap-2 py-1">
                <code className="text-xs font-mono">{perm.value}</code>
                <Badge variant="outline" className="text-[10px]">{perm.category}</Badge>
                <span className="text-[10px] text-muted-foreground">— {perm.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Rate Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• Default: <strong>60 requests/minute</strong> per API key</p>
            <p>• Rate limit headers included in responses:</p>
            <code className="block bg-muted p-2 rounded text-[10px] font-mono">
              X-RateLimit-Limit: 60{'\n'}
              X-RateLimit-Remaining: 58{'\n'}
              X-RateLimit-Reset: 1710835200
            </code>
            <p>• Exceeding limits returns <code className="bg-muted px-1 rounded">429 Too Many Requests</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default McpDeveloperDashboard;
