import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GlobalSearchProps {
  onUserSelect: (user: any) => void;
  currentUserId: string;
  currentUsername?: string;
}

export const GlobalSearch = ({ onUserSelect, currentUserId, currentUsername }: GlobalSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const { toast } = useToast();

  const normalizePhone = (phone: string) => {
    return phone.replace(/[^\d+]/g, '');
  };

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const normalizedSearch = normalizePhone(value);
      
      // Search by username, email, or phone
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${value}%,email.ilike.%${value}%,phone_number.eq.${value},phone_search.eq.${normalizedSearch}`)
        .neq('id', currentUserId)
        .limit(10);

      if (error) throw error;

      console.log('🔍 Search results:', data);
      setSearchResults(data || []);

      // If no results found and looks like a phone number, offer to invite
      if ((!data || data.length === 0) && /^\+?\d{10,15}$/.test(normalizedSearch)) {
        setInvitePhone(value);
        setShowInviteDialog(true);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvite = async () => {
    if (!invitePhone) return;

    setIsSendingInvite(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-invite', {
        body: {
          phoneNumber: invitePhone,
          inviterName: currentUsername || 'A friend',
        },
      });

      if (error) throw error;

      toast({
        title: 'Invite sent! 🎉',
        description: `WhatsApp invite sent to ${invitePhone}`,
      });

      setShowInviteDialog(false);
      setSearchTerm('');
      setInvitePhone('');
    } catch (error: any) {
      console.error('Invite error:', error);
      toast({
        title: 'Failed to send invite',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleUserSelect = async (user: any) => {
    // Add user to contacts if not already
    try {
      await supabase
        .from('contacts')
        .upsert({
          user_id: currentUserId,
          contact_user_id: user.id,
          contact_name: user.username,
          contact_phone: user.phone_number,
          is_registered: true,
        }, {
          onConflict: 'user_id,contact_phone',
        });

      onUserSelect(user);
      setSearchTerm('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Error adding contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to add contact',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className="pl-10 rounded-xl glass border-border/30 h-9 text-[15px] backdrop-blur-sm"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-96 overflow-y-auto z-50 mx-4">
          {searchResults.map((user) => (
            <button
              key={user.id}
              onClick={() => handleUserSelect(user)}
              className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <Avatar className="h-10 w-10">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">{user.username}</p>
                <p className="text-xs text-muted-foreground">
                  {user.phone_number || user.email}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {user.is_online ? (
                  <span className="text-green-500">● Online</span>
                ) : (
                  'Offline'
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Not Found</DialogTitle>
            <DialogDescription>
              No user found with this phone number. Would you like to invite them to join Chatr+?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-sm">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{invitePhone}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We'll send them a WhatsApp message with an invitation link to join Chatr+ and connect with you.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={isSendingInvite}
                className="flex-1"
              >
                {isSendingInvite ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
