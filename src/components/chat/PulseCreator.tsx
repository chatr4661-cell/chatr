import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Radio, Send, Zap, Image as ImageIcon, Mic, FileText } from 'lucide-react';

interface PulseCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: any[];
  userId: string;
  onPulseSent: () => void;
}

export const PulseCreator = ({ 
  open, 
  onOpenChange, 
  contacts, 
  userId,
  onPulseSent 
}: PulseCreatorProps) => {
  const [pulseMessage, setPulseMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleRecipientToggle = (recipientId: string) => {
    setSelectedRecipients(prev =>
      prev.includes(recipientId)
        ? prev.filter(id => id !== recipientId)
        : [...prev, recipientId]
    );
  };

  const handleSendPulse = async () => {
    if (!pulseMessage.trim() || selectedRecipients.length === 0) {
      toast({
        title: "Error",
        description: "Please enter a message and select at least one recipient",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      // Send pulse message to each selected recipient
      for (const recipientId of selectedRecipients) {
        // Find or create conversation
        const { data: conversationId, error: convError } = await supabase
          .rpc('create_direct_conversation', {
            other_user_id: recipientId
          });

        if (convError) throw convError;

        // Send message
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            content: `⚡ ${pulseMessage}`,
            message_type: 'text'
          });

        if (messageError) throw messageError;
      }

      toast({
        title: "Success",
        description: `Pulse sent to ${selectedRecipients.length} recipient(s)`
      });

      onPulseSent();
      onOpenChange(false);
      
      // Reset form
      setPulseMessage('');
      setSelectedRecipients([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send pulse",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const selectAll = () => {
    setSelectedRecipients(contacts.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedRecipients([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            Send Pulse
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Quick broadcast to multiple contacts
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pulse-message">Your Message *</Label>
            <Textarea
              id="pulse-message"
              placeholder="What's the update?"
              value={pulseMessage}
              onChange={(e) => setPulseMessage(e.target.value)}
              rows={4}
              maxLength={500}
              className="rounded-xl resize-none"
            />
            <div className="flex justify-between items-center px-1">
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" disabled>
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" disabled>
                  <Mic className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" disabled>
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {pulseMessage.length}/500
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recipients *</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="h-7 text-xs rounded-lg"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  className="h-7 text-xs rounded-lg"
                >
                  Clear
                </Button>
              </div>
            </div>
            <ScrollArea className="h-56 border rounded-xl">
              <div className="p-3 space-y-1">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center space-x-3 p-2.5 hover:bg-muted/70 rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleRecipientToggle(contact.id)}
                  >
                    <Checkbox
                      checked={selectedRecipients.includes(contact.id)}
                      onCheckedChange={() => handleRecipientToggle(contact.id)}
                    />
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={contact.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-700">
                        {contact.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.username}</p>
                      {contact.phone_number && (
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.phone_number}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                {selectedRecipients.length} recipient(s) selected
              </p>
              {selectedRecipients.length > 0 && (
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700">
                  <Zap className="h-3 w-3 mr-1" />
                  Ready to pulse
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendPulse}
            disabled={isSending || !pulseMessage.trim() || selectedRecipients.length === 0}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send Pulse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};