import { useState } from 'react';
import { Search, Sparkles, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function AIBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search or ask AI anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button size="icon" variant="ghost" onClick={() => navigate('/capture')}>
            <Camera className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* AI Input Section */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-1" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2">AI Assistant</h2>
              <Input
                type="text"
                placeholder="Ask AI to search, summarize, or explain..."
                className="mb-3"
              />
              <p className="text-sm text-muted-foreground">
                AI will search multiple sources and provide a comprehensive answer
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Results Section - Empty Placeholder */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Start searching to see results</p>
        </div>
      </div>

      {/* Floating Chat Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 w-14 p-0"
        onClick={() => navigate('/chat')}
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    </div>
  );
}
