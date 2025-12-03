import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, Camera, Users, Shield, ShieldCheck, 
  UserMinus, Crown, LogOut, Trash2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Participant {
  user_id: string;
  role: string;
  profiles: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onUpdate: () => void;
}

export const GroupSettingsDialog = ({
  open,
  onOpenChange,
  conversationId,
  onUpdate
}: GroupSettingsDialogProps) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupIcon, setGroupIcon] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'leave' | 'delete';
    userId?: string;
    username?: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      loadGroupData();
    }
  }, [open, conversationId]);

  const loadGroupData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Load conversation details
      const { data: conv } = await supabase
        .from('conversations')
        .select('group_name, community_description, group_icon_url')
        .eq('id', conversationId)
        .single();

      if (conv) {
        setGroupName(conv.group_name || '');
        setGroupDescription(conv.community_description || '');
        setGroupIcon(conv.group_icon_url || '');
      }

      // Load participants with profiles
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id, role, profiles!inner(id, username, avatar_url)')
        .eq('conversation_id', conversationId);

      if (parts) {
        setParticipants(parts as unknown as Participant[]);
        const myRole = parts.find(p => p.user_id === user.id)?.role;
        setCurrentUserRole(myRole || 'member');
      }
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';

  const saveSettings = async () => {
    if (!isAdmin) {
      toast.error('Only admins can edit group settings');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          group_name: groupName,
          community_description: groupDescription,
          group_icon_url: groupIcon || null
        })
        .eq('id', conversationId);

      if (error) throw error;
      toast.success('Group settings updated');
      onUpdate();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const promoteToAdmin = async (userId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ role: 'admin' })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Member promoted to admin');
      loadGroupData();
    } catch (error) {
      toast.error('Failed to promote member');
    }
  };

  const demoteFromAdmin = async (userId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ role: 'member' })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Admin demoted to member');
      loadGroupData();
    } catch (error) {
      toast.error('Failed to demote admin');
    }
  };

  const removeMember = async (userId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Member removed from group');
      loadGroupData();
      setConfirmAction(null);
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const leaveGroup = async () => {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUserId);

      if (error) throw error;
      toast.success('You left the group');
      onOpenChange(false);
      onUpdate();
      setConfirmAction(null);
    } catch (error) {
      toast.error('Failed to leave group');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="default" className="bg-amber-500"><Crown className="h-3 w-3 mr-1" />Owner</Badge>;
      case 'admin':
        return <Badge variant="secondary"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Group Settings
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={groupIcon} />
                      <AvatarFallback>{groupName?.slice(0, 2).toUpperCase() || 'GR'}</AvatarFallback>
                    </Avatar>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full"
                        onClick={() => {/* TODO: Image picker */}}
                      >
                        <Camera className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label>Group Name</Label>
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      disabled={!isAdmin}
                      placeholder="Enter group name"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="What's this group about?"
                    rows={2}
                  />
                </div>

                {isAdmin && (
                  <Button onClick={saveSettings} disabled={saving} className="w-full">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>

              {/* Participants */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4" />
                  Members ({participants.length})
                </Label>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {participants.map((p) => (
                      <div
                        key={p.user_id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={p.profiles.avatar_url} />
                            <AvatarFallback>
                              {p.profiles.username?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {p.profiles.username}
                              {p.user_id === currentUserId && (
                                <span className="text-xs text-muted-foreground">(You)</span>
                              )}
                            </p>
                            {getRoleBadge(p.role)}
                          </div>
                        </div>

                        {isAdmin && p.user_id !== currentUserId && p.role !== 'owner' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Shield className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              {p.role === 'admin' ? (
                                <DropdownMenuItem onClick={() => demoteFromAdmin(p.user_id)}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Remove Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => promoteToAdmin(p.user_id)}>
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  Make Admin
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setConfirmAction({
                                  type: 'remove',
                                  userId: p.user_id,
                                  username: p.profiles.username
                                })}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove from Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Leave Group */}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setConfirmAction({ type: 'leave' })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Group
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'leave' ? 'Leave Group?' : 'Remove Member?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'leave' 
                ? "You won't be able to see messages in this group anymore."
                : `Are you sure you want to remove ${confirmAction?.username} from this group?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (confirmAction?.type === 'leave') {
                  leaveGroup();
                } else if (confirmAction?.type === 'remove' && confirmAction.userId) {
                  removeMember(confirmAction.userId);
                }
              }}
            >
              {confirmAction?.type === 'leave' ? 'Leave' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};