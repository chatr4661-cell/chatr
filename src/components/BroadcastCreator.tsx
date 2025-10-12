import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Radio, Send } from 'lucide-react';

interface BroadcastCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: any[];
  userId: string;
}

export const BroadcastCreator = ({ 
  open, 
  onOpenChange, 
  contacts, 
  userId 
}: BroadcastCreatorProps) => {
  const [listName, setListName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleRecipientToggle = (contactId: string) => {
    setSelectedRecipients(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSendBroadcast = async () => {
    if (!listName.trim() || !message.trim() || selectedRecipients.length === 0) {
      toast({
        title: "Error",
        description: "Please enter a list name, message, and select at least one recipient",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      // Create broadcast list
      const { data: broadcastList, error: listError } = await supabase
        .from('broadcast_lists')
        .insert({
          name: listName,
          user_id: userId
        })
        .select()
        .single();

      if (listError) throw listError;

      // Add recipients to broadcast list
      const recipients = selectedRecipients.map(recipientId => ({
        broadcast_id: broadcastList.id,
        recipient_id: recipientId
      }));

      const { error: recipientsError } = await supabase
        .from('broadcast_recipients')
        .insert(recipients);

      if (recipientsError) throw recipientsError;

      // Send message to each recipient as individual conversation
      for (const recipientId of selectedRecipients) {
        try {
          // Find or create conversation with recipient
          const { data: conversationId } = await supabase.rpc('create_direct_conversation', {
            other_user_id: recipientId
          });

          if (conversationId) {
            // Send message
            await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                sender_id: userId,
                content: message,
                message_type: 'text'
              });
          }
        } catch (error) {
          console.error(`Failed to send to recipient ${recipientId}:`, error);
        }
      }

      toast({
        title: "Broadcast Sent!",
        description: `Message sent to ${selectedRecipients.length} recipient(s)`,
      });

      onOpenChange(false);
      
      // Reset form
      setListName('');
      setMessage('');
      setSelectedRecipients([]);
    } catch (error: any) {
      console.error('Broadcast error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send broadcast",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            New Broadcast
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Send a message to multiple contacts at once
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">Broadcast List Name *</Label>
            <Input
              id="list-name"
              placeholder="e.g., Team Updates, Family, etc."
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-message">Your Message *</Label>
            <Textarea
              id="broadcast-message"
              placeholder="What would you like to tell everyone?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Recipients *</Label>
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-4 space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No contacts available
                  </p>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                      onClick={() => handleRecipientToggle(contact.id)}
                    >
                      <Checkbox
                        checked={selectedRecipients.includes(contact.id)}
                        onCheckedChange={() => handleRecipientToggle(contact.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback>
                          {contact.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{contact.username}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedRecipients.length} recipient(s) selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendBroadcast}
            disabled={isSending || !listName.trim() || !message.trim() || selectedRecipients.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send Broadcast"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
