import React, { useState, useEffect } from 'react';
import { Zap, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuickReplyTemplates } from '@/hooks/useQuickReplyTemplates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface QuickReplyPanelProps {
  onSelectTemplate: (text: string) => void;
  className?: string;
}

export const QuickReplyPanel = ({
  onSelectTemplate,
  className
}: QuickReplyPanelProps) => {
  const { templates, loading, fetchTemplates, useTemplate, createTemplate } = useQuickReplyTemplates();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTemplateText, setNewTemplateText] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelect = async (templateId: string) => {
    const text = await useTemplate(templateId);
    if (text) {
      onSelectTemplate(text);
    }
  };

  const handleCreate = async () => {
    if (!newTemplateText.trim()) return;
    await createTemplate(newTemplateText);
    setNewTemplateText('');
    setIsCreateOpen(false);
  };

  if (loading) {
    return (
      <div className={cn("flex gap-2 overflow-x-auto py-2", className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-muted rounded-full h-8 w-24 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Quick Replies
        </span>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              + Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Quick Reply</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={newTemplateText}
                onChange={(e) => setNewTemplateText(e.target.value)}
                placeholder="Type your quick reply..."
              />
              <Button onClick={handleCreate} className="w-full">
                Save Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {templates.map(template => (
            <Button
              key={template.id}
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs shrink-0 max-w-[150px]"
              onClick={() => handleSelect(template.id)}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              <span className="truncate">{template.text}</span>
            </Button>
          ))}
          {templates.length === 0 && (
            <span className="text-xs text-muted-foreground px-2">
              No templates yet. Add one!
            </span>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
