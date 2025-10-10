import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Users, Upload, Image as ImageIcon, Lock, Globe } from 'lucide-react';

interface ClusterCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: any[];
  userId: string;
  onClusterCreated: (clusterId: string) => void;
}

export const ClusterCreator = ({ 
  open, 
  onOpenChange, 
  contacts, 
  userId,
  onClusterCreated 
}: ClusterCreatorProps) => {
  const [clusterName, setClusterName] = useState('');
  const [clusterDescription, setClusterDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreateCluster = async () => {
    if (!clusterName.trim() || selectedMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please enter a cluster name and select at least one member",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create cluster conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          is_group: true,
          group_name: clusterName,
          group_description: clusterDescription,
          created_by: userId,
          admin_id: userId,
          is_public: !isPrivate
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants (creator + selected members)
      const participants = [
        { conversation_id: conversation.id, user_id: userId, role: 'admin' },
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
        description: "Cluster created successfully"
      });

      onClusterCreated(conversation.id);
      onOpenChange(false);
      
      // Reset form
      setClusterName('');
      setClusterDescription('');
      setSelectedMembers([]);
      setIsPrivate(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create cluster",
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
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Create New Cluster
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cluster Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Users className="h-10 w-10 text-primary-foreground" />
              </div>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full h-7 w-7"
              >
                <Upload className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cluster-name">Cluster Name *</Label>
            <Input
              id="cluster-name"
              placeholder="Enter cluster name"
              value={clusterName}
              onChange={(e) => setClusterName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cluster-description">Description</Label>
            <Textarea
              id="cluster-description"
              placeholder="What's this cluster about?"
              value={clusterDescription}
              onChange={(e) => setClusterDescription(e.target.value)}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2">
              {isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              <div>
                <p className="text-sm font-medium">{isPrivate ? 'Private' : 'Public'} Cluster</p>
                <p className="text-xs text-muted-foreground">
                  {isPrivate ? 'Only invited members can join' : 'Anyone can join'}
                </p>
              </div>
            </div>
            <Checkbox
              checked={!isPrivate}
              onCheckedChange={(checked) => setIsPrivate(!checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Add Members *</Label>
            <ScrollArea className="h-48 border rounded-xl">
              <div className="p-3 space-y-1">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center space-x-3 p-2.5 hover:bg-muted/70 rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleMemberToggle(contact.id)}
                  >
                    <Checkbox
                      checked={selectedMembers.includes(contact.id)}
                      onCheckedChange={() => handleMemberToggle(contact.id)}
                    />
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={contact.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
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
                {selectedMembers.length} member(s) selected
              </p>
              <Badge variant="secondary" className="text-xs">
                +1 You
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateCluster}
            disabled={isCreating || !clusterName.trim() || selectedMembers.length === 0}
            className="rounded-xl"
          >
            <Users className="h-4 w-4 mr-2" />
            {isCreating ? "Creating..." : "Create Cluster"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};