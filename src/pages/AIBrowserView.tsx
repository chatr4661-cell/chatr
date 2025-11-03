import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Home, Plus, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrowserTab {
  id: string;
  url: string;
  title: string;
}

const AIBrowserView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam && tabs.length === 0) {
      addNewTab(urlParam);
    } else if (tabs.length === 0) {
      addNewTab('https://google.com');
    }
  }, [searchParams]);

  const addNewTab = (url: string) => {
    const newTab: BrowserTab = {
      id: Date.now().toString(),
      url: url,
      title: new URL(url).hostname,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setCurrentUrl(url);
    setInputUrl(url);
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter((t) => t.id !== tabId);
    if (newTabs.length === 0) {
      navigate('/home');
      return;
    }
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
      setCurrentUrl(newTabs[0].url);
    }
  };

  const switchTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      setActiveTabId(tabId);
      setCurrentUrl(tab.url);
      setInputUrl(tab.url);
    }
  };

  const navigateToUrl = (url: string) => {
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = `https://${url}`;
    }
    
    const updatedTabs = tabs.map((tab) =>
      tab.id === activeTabId ? { ...tab, url: finalUrl } : tab
    );
    setTabs(updatedTabs);
    setCurrentUrl(finalUrl);
  };

  const summarizePage = async () => {
    setShowAiAssist(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: {
          action: 'summarize_url',
          url: currentUrl,
        },
      });

      if (error) throw error;
      setAiSummary(data.summary || 'No summary available');
    } catch (error) {
      toast.error('Failed to generate AI summary');
      setAiSummary('Summary unavailable');
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Browser Controls */}
      <div className="bg-background border-b border-border/50 sticky top-0 z-10">
        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="flex gap-1 px-2 pt-2 overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-all min-w-[120px] max-w-[200px] ${
                  activeTabId === tab.id
                    ? 'bg-secondary border-t border-x border-border/50'
                    : 'bg-secondary/30 hover:bg-secondary/50'
                }`}
              >
                <span className="text-xs truncate flex-1">{tab.title}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* URL Bar */}
        <div className="flex items-center gap-2 p-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate('/home')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 flex items-center gap-2">
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && navigateToUrl(inputUrl)}
              placeholder="Enter URL or search..."
              className="rounded-full bg-secondary/50 border-primary/20"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigateToUrl(inputUrl)}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => addNewTab('https://google.com')}
          >
            <Plus className="h-5 w-5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={summarizePage}
            className="text-primary"
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* AI Assist Panel */}
      {showAiAssist && (
        <Card className="m-2 p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium text-primary">AI Summary</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setShowAiAssist(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-foreground/80">
            {aiSummary || 'Generating summary...'}
          </p>
        </Card>
      )}

      {/* Browser Content */}
      <div className="flex-1 relative bg-white">
        <iframe
          src={currentUrl}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title="Browser Content"
        />
      </div>
    </div>
  );
};

export default AIBrowserView;
