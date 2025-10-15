import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Mail } from 'lucide-react';

interface TeamInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onSuccess: () => void;
}

export function TeamInviteDialog({
  open,
  onOpenChange,
  businessId,
  onSuccess,
}: TeamInviteDialogProps) {
  const { toast } = useToast();
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');

  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    try {
      // Check if user exists with this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!existingProfile) {
        toast({
          title: 'User Not Found',
          description: 'This user needs to create a Chatr account first',
          variant: 'destructive',
        });
        return;
      }

      // Check if already a team member
      const { data: existingMember } = await supabase
        .from('business_team_members')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', existingProfile.id)
        .single();

      if (existingMember) {
        toast({
          title: 'Already a Member',
          description: 'This user is already part of your team',
          variant: 'destructive',
        });
        return;
      }

      // Get current user ID for invited_by
      const { data: { user } } = await supabase.auth.getUser();

      // Add team member
      const { error } = await supabase
        .from('business_team_members')
        .insert({
          business_id: businessId,
          user_id: existingProfile.id,
          role: role,
          invited_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Team member invited successfully`,
      });

      setEmail('');
      setRole('member');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error inviting team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to invite team member',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Invite someone to join your business team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              User must already have a Chatr account
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Admins can manage team and settings
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={inviting}
            className="flex-1 bg-gradient-hero"
          >
            {inviting ? 'Inviting...' : 'Send Invite'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
