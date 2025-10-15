import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Hash,
  AlertCircle,
  Clock,
  Languages as LanguagesIcon,
  CheckCircle2
} from 'lucide-react';

interface AIInsightsPanelProps {
  open: boolean;
  onClose: () => void;
  insights: any;
  type: 'sentiment' | 'topics' | 'urgency' | 'language';
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  open,
  onClose,
  insights,
  type
}) => {
  const renderSentimentInsights = () => {
    if (!insights) return null;
    
    const getSentimentIcon = () => {
      if (insights.sentiment === 'positive') return <TrendingUp className="h-5 w-5 text-green-600" />;
      if (insights.sentiment === 'negative') return <TrendingDown className="h-5 w-5 text-red-600" />;
      return <Minus className="h-5 w-5 text-yellow-600" />;
    };

    const getSentimentColor = () => {
      if (insights.sentiment === 'positive') return 'bg-green-100 text-green-800 border-green-200';
      if (insights.sentiment === 'negative') return 'bg-red-100 text-red-800 border-red-200';
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {getSentimentIcon()}
          <div>
            <Badge className={getSentimentColor()}>
              {insights.sentiment?.toUpperCase()}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              Confidence: {insights.confidence}%
            </p>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-medium mb-2">Analysis</h4>
          <p className="text-sm text-muted-foreground">{insights.summary}</p>
        </div>

        {insights.mood_indicators && insights.mood_indicators.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Detected Emotions</h4>
              <div className="flex flex-wrap gap-2">
                {insights.mood_indicators.map((mood: string, i: number) => (
                  <Badge key={i} variant="outline">{mood}</Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderTopicsInsights = () => {
    if (!insights) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          <Badge>{insights.category}</Badge>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-3">Main Topics</h4>
          <div className="space-y-2">
            {insights.topics?.map((topic: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{topic}</span>
              </div>
            ))}
          </div>
        </div>

        {insights.keywords && insights.keywords.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {insights.keywords.map((keyword: string, i: number) => (
                  <Badge key={i} variant="secondary">{keyword}</Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderUrgencyInsights = () => {
    if (!insights) return null;

    const getUrgencyColor = () => {
      if (insights.urgency === 'high') return 'bg-red-100 text-red-800 border-red-200';
      if (insights.urgency === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-green-100 text-green-800 border-green-200';
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-primary" />
          <div>
            <Badge className={getUrgencyColor()}>
              {insights.urgency?.toUpperCase()} URGENCY
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              Priority Score: {insights.priority_score}/100
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Requires Action</span>
            <Badge variant={insights.requires_action ? "default" : "outline"}>
              {insights.requires_action ? 'Yes' : 'No'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Deadline Mentioned</span>
            <Badge variant={insights.deadline_mentioned ? "default" : "outline"}>
              {insights.deadline_mentioned ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  const renderLanguageInsights = () => {
    if (!insights) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <LanguagesIcon className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Primary Language</p>
            <Badge className="mt-1">{insights.primary_language}</Badge>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-3">Detected Languages</h4>
          <div className="flex flex-wrap gap-2">
            {insights.languages?.map((lang: string, i: number) => (
              <Badge key={i} variant="outline">{lang}</Badge>
            ))}
          </div>
        </div>

        {insights.mixed_language && (
          <>
            <Separator />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <Clock className="h-4 w-4 inline mr-1" />
                This conversation uses multiple languages
              </p>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (type === 'sentiment') return renderSentimentInsights();
    if (type === 'topics') return renderTopicsInsights();
    if (type === 'urgency') return renderUrgencyInsights();
    if (type === 'language') return renderLanguageInsights();
    return null;
  };

  const getTitle = () => {
    if (type === 'sentiment') return 'Sentiment Analysis';
    if (type === 'topics') return 'Topic Extraction';
    if (type === 'urgency') return 'Urgency Analysis';
    if (type === 'language') return 'Language Detection';
    return 'AI Insights';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[500px]">
          {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
