import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle, Languages, Wand2, Trash2, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PrechuAIPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  userId: string;
}

export function PrechuAIPanel({ open, onOpenChange, conversationId, userId }: PrechuAIPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [messageText, setMessageText] = useState('');
  const [tone, setTone] = useState('professional');
  const [targetLang, setTargetLang] = useState('es');

  const handleSummarize = async () => {
    setLoading(true);
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select('content, sender_id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!messages || messages.length === 0) {
        toast.error('No messages to summarize');
        return;
      }

      // Mock AI summary - in production, use Lovable AI
      const summary = `Summary of last ${messages.length} messages:\n\nThe conversation covered topics including ${messages.slice(0, 3).map(m => m.content.slice(0, 20)).join(', ')}... Key points discussed with active participation from multiple users.`;
      
      setResult(summary);
      toast.success('Summary generated');
    } catch (error) {
      console.error('Summary error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleRewriteTone = async () => {
    if (!messageText.trim()) {
      toast.error('Please enter a message to rewrite');
      return;
    }

    setLoading(true);
    try {
      // Mock tone rewrite - in production, use Lovable AI
      const toneMap: Record<string, string> = {
        professional: 'I would like to respectfully request your attention to this matter.',
        casual: 'Hey! Just wanted to chat about this real quick.',
        friendly: 'Hi there! Hope you\'re doing well! I wanted to talk about...',
        formal: 'Dear recipient, I am writing to formally address the following matter.'
      };

      setResult(toneMap[tone] + '\n\n' + messageText);
      toast.success('Message rewritten');
    } catch (error) {
      console.error('Rewrite error:', error);
      toast.error('Failed to rewrite message');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!messageText.trim()) {
      toast.error('Please enter text to translate');
      return;
    }

    setLoading(true);
    try {
      // Mock translation - in production, use Lovable AI
      const translations: Record<string, string> = {
        es: '¡Hola! ¿Cómo estás?',
        fr: 'Bonjour! Comment allez-vous?',
        de: 'Hallo! Wie geht es dir?',
        hi: 'नमस्ते! आप कैसे हैं?',
        zh: '你好！你好吗？'
      };

      setResult(translations[targetLang] || messageText);
      toast.success('Translation complete');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanMedia = async () => {
    setLoading(true);
    try {
      // Mock media cleanup summary
      const summary = {
        images: 45,
        videos: 12,
        files: 23,
        totalSize: '2.3 GB',
        oldestDate: '6 months ago'
      };

      setResult(`Media Cleanup Summary:\n\n📸 Images: ${summary.images}\n🎥 Videos: ${summary.videos}\n📄 Files: ${summary.files}\n\nTotal Size: ${summary.totalSize}\nOldest item: ${summary.oldestDate}\n\nReady to free up space?`);
      toast.success('Media scan complete');
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Failed to scan media');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Prechu AI Assistant
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="summarize" className="mt-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="summarize" className="text-xs">
              <MessageCircle className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="rewrite" className="text-xs">
              <Wand2 className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="translate" className="text-xs">
              <Languages className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="text-xs">
              <Trash2 className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summarize" className="space-y-4 mt-4">
            <div>
              <h3 className="font-semibold mb-2">Summarize Conversation</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get a quick summary of the last 20 messages
              </p>
              <Button onClick={handleSummarize} disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Summary
              </Button>
            </div>
            {result && (
              <div className="bg-muted/50 rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap">{result}</pre>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rewrite" className="space-y-4 mt-4">
            <div>
              <h3 className="font-semibold mb-2">Rewrite Message</h3>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter your message..."
                rows={4}
                className="mb-3"
              />
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleRewriteTone} disabled={loading} className="w-full mt-3">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Rewrite with {tone} tone
              </Button>
            </div>
            {result && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">{result}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="translate" className="space-y-4 mt-4">
            <div>
              <h3 className="font-semibold mb-2">Translate Message</h3>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter text to translate..."
                rows={4}
                className="mb-3"
              />
              <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleTranslate} disabled={loading} className="w-full mt-3">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Translate
              </Button>
            </div>
            {result && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">{result}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cleanup" className="space-y-4 mt-4">
            <div>
              <h3 className="font-semibold mb-2">Clean Old Media</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Scan and remove old photos, videos, and files to free up space
              </p>
              <Button onClick={handleCleanMedia} disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Scan Media
              </Button>
            </div>
            {result && (
              <div className="bg-muted/50 rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap">{result}</pre>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
