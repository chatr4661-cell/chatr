import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Update dropdown position when search results change
  useEffect(() => {
    if (searchResults.length > 0 && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [searchResults]);

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
        // Ensure phone has + prefix for invite
        const phoneToInvite = value.startsWith('+') ? value : `+${value}`;
        setInvitePhone(phoneToInvite);
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

  const handleSendInvite = () => {
    if (!invitePhone) return;

    // Remove + and spaces for WhatsApp URL
    const cleanPhone = invitePhone.replace(/[^0-9]/g, '');
    
    // Create invite message
    const inviteMessage = `Hey! 👋 ${currentUsername || 'A friend'} invited you to join Chatr+ - a secure messaging platform with healthcare features.\n\nDownload and start chatting: ${window.location.origin}`;
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(inviteMessage)}`;
    window.open(whatsappUrl, '_blank');

    toast({
      title: 'Opening WhatsApp... 💬',
      description: 'Send the invite message to get them on board!',
    });

    setShowInviteDialog(false);
    setSearchTerm('');
    setInvitePhone('');
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
      <div ref={inputRef} className="relative">
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

      {/* Search Results Dropdown - Rendered via Portal */}
      {searchResults.length > 0 && createPortal(
        <div 
          className="fixed bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-elevated max-h-96 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 9999
          }}
        >
          {searchResults.map((user) => (
            <button
              key={user.id}
              onClick={() => handleUserSelect(user)}
              className="w-full flex items-center gap-3 p-4 hover:bg-primary/10 transition-colors first:rounded-t-2xl last:rounded-b-2xl border-b border-border/30 last:border-b-0"
            >
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground font-semibold">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground text-base">{user.username}</p>
                <p className="text-sm text-muted-foreground">
                  {user.phone_number || user.email}
                </p>
              </div>
              <div className="text-xs">
                {user.is_online ? (
                  <span className="flex items-center gap-1.5 text-green-500 font-medium">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Online
                  </span>
                ) : (
                  <span className="text-muted-foreground">Offline</span>
                )}
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}

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
            
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">📱 Important Phone Format:</p>
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 ml-4">
                <li>• Must include country code (e.g., +919717845477)</li>
                <li>• For India: +91 followed by 10 digits</li>
                <li>• For US: +1 followed by 10 digits</li>
              </ul>
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
                className="flex-1"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Open WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
