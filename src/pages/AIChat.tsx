import { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function AIChat() {
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">AI Chat</h1>
        </div>
      </header>

      {/* Chat Messages - Empty Placeholder */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 overflow-y-auto">
        <div className="text-center py-12 text-muted-foreground">
          <p>Start a conversation with AI</p>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-card border-t px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
          />
          <Button size="icon">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
