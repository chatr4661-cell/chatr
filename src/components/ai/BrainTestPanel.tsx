/**
 * CHATR Brain Test Panel
 * Interactive testing interface for the unified AI Brain
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatrBrain } from '@/hooks/useChatrBrain';
import { 
  Brain, 
  Send, 
  Loader2, 
  Zap, 
  MapPin, 
  Briefcase, 
  Heart, 
  Search,
  User,
  Clock
} from 'lucide-react';
import { BrainResponse, AgentType } from '@/services/chatrBrain/types';

const agentIcons: Record<AgentType, React.ReactNode> = {
  personal: <User className="h-3 w-3" />,
  work: <Briefcase className="h-3 w-3" />,
  search: <Search className="h-3 w-3" />,
  local: <MapPin className="h-3 w-3" />,
  jobs: <Briefcase className="h-3 w-3" />,
  health: <Heart className="h-3 w-3" />,
};

const agentColors: Record<AgentType, string> = {
  personal: 'bg-blue-500/20 text-blue-400',
  work: 'bg-orange-500/20 text-orange-400',
  search: 'bg-green-500/20 text-green-400',
  local: 'bg-purple-500/20 text-purple-400',
  jobs: 'bg-yellow-500/20 text-yellow-400',
  health: 'bg-red-500/20 text-red-400',
};

export function BrainTestPanel() {
  const { query, quickDetect, isReady, isProcessing, error } = useChatrBrain();
  const [input, setInput] = useState('');
  const [responses, setResponses] = useState<BrainResponse[]>([]);
  const [quickResult, setQuickResult] = useState<ReturnType<typeof quickDetect> | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    try {
      const response = await query(input);
      setResponses(prev => [response, ...prev]);
      setInput('');
    } catch (err) {
      console.error('Brain query failed:', err);
    }
  };

  const handleQuickDetect = () => {
    if (!input.trim()) return;
    const result = quickDetect(input);
    setQuickResult(result);
  };

  const testQueries = [
    "Find me a plumber nearby",
    "What's the weather today?",
    "I have a headache, what should I do?",
    "Find jobs for software developer in Delhi",
    "Help me write an email to my boss",
    "Book a doctor appointment"
  ];

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Brain className="h-4 w-4 text-white" />
          </div>
          CHATR Brain Test
          {isReady ? (
            <Badge variant="outline" className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
              <Zap className="h-3 w-3 mr-1" /> Ready
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-2">Initializing...</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Test Buttons */}
        <div className="flex flex-wrap gap-2">
          {testQueries.map((q, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setInput(q)}
            >
              {q.slice(0, 25)}...
            </Button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a query to test the Brain..."
            className="flex-1"
            disabled={!isReady || isProcessing}
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleQuickDetect}
            disabled={!input.trim()}
          >
            Detect
          </Button>
          <Button 
            type="submit" 
            disabled={!isReady || isProcessing || !input.trim()}
            className="bg-gradient-to-r from-primary to-purple-600"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Quick Detection Result */}
        {quickResult && (
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-sm">
              <div className="font-medium mb-2">Quick Detection Result:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Intent: <Badge variant="secondary">{quickResult.primary}</Badge></div>
                <div>Confidence: <Badge variant="outline">{(quickResult.confidence * 100).toFixed(0)}%</Badge></div>
                <div className="col-span-2">
                  Agents: {quickResult.agents.map(a => (
                    <Badge key={a} className={`ml-1 ${agentColors[a]}`}>
                      {agentIcons[a]} {a}
                    </Badge>
                  ))}
                </div>
                {quickResult.actionRequired !== 'none' && (
                  <div className="col-span-2">Action: <Badge variant="destructive">{quickResult.actionRequired}</Badge></div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            Error: {error}
          </div>
        )}

        {/* Response History */}
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {responses.map((res, i) => (
              <Card key={i} className="bg-card/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {res.agents.map(a => (
                        <Badge key={a} className={`text-xs ${agentColors[a]}`}>
                          {agentIcons[a]} {a}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {res.latencyMs}ms
                    </div>
                  </div>
                  <p className="text-sm">{res.answer}</p>
                  {res.action && res.action.type !== 'none' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10">
                        Action: {res.action.buttonLabel || res.action.type}
                      </Badge>
                      {res.action.ready && (
                        <Button size="sm" variant="default" className="h-6 text-xs">
                          {res.action.buttonLabel || 'Execute'}
                        </Button>
                      )}
                    </div>
                  )}
                  {res.followUp && res.followUp.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {res.followUp.map((f, j) => (
                        <Button 
                          key={j} 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs"
                          onClick={() => setInput(f)}
                        >
                          {f}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
