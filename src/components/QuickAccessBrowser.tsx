import { Globe, Search, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export const QuickAccessBrowser = () => {
  const navigate = useNavigate();

  return (
    <Card 
      className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:border-primary/40 transition-all"
      onClick={() => navigate('/ai-browser-home')}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            AI Browser
            <Sparkles className="h-4 w-4 text-primary" />
          </h3>
          <p className="text-sm text-muted-foreground">Search with AI • Browse the web</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Search className="h-3 w-3" />
        <span>Voice search • Smart answers • Tab management</span>
      </div>
    </Card>
  );
};
