import { useState } from 'react';
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
import { Users, Image as ImageIcon } from 'lucide-react';

interface GroupChatCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: any[];
  userId: string;
  onGroupCreated: (groupId: string) => void;
}

export const GroupChatCreator = ({ 
  open, 
  onOpenChange, 
  contacts, 
  userId,
  onGroupCreated 
}: GroupChatCreatorProps) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please enter a group name and select at least one member",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create group conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          is_group: true,
          group_name: groupName,
          group_description: groupDescription,
          created_by: userId,
          admin_id: userId
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants (creator + selected members)
      const participants = [
        { conversation_id: conversation.id, user_id: userId, role: 'creator' },
        ...selectedMembers.map(memberId => ({
          conversation_id: conversation.id,
          user_id: memberId,
          role: 'member'
        }))
      ];

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast({
        title: "Success",
        description: "Group created successfully"
      });

      onGroupCreated(conversation.id);
      onOpenChange(false);
      
      // Reset form
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name *</Label>
            <Input
              id="group-name"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Description (Optional)</Label>
            <Textarea
              id="group-description"
              placeholder="What's this group about?"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Members *</Label>
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-4 space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                    onClick={() => handleMemberToggle(contact.id)}
                  >
                    <Checkbox
                      checked={selectedMembers.includes(contact.id)}
                      onCheckedChange={() => handleMemberToggle(contact.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={contact.avatar_url} />
                      <AvatarFallback>
                        {contact.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{contact.username}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedMembers.length} member(s) selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={isCreating || !groupName.trim() || selectedMembers.length === 0}
          >
            <Users className="h-4 w-4 mr-2" />
            {isCreating ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
