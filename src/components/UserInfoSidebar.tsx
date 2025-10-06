import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, Calendar, Activity, User } from 'lucide-react';
import { format } from 'date-fns';

interface Contact {
  id: string;
  username: string;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
  status: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  age: number | null;
  gender: string | null;
}

interface UserInfoSidebarProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserInfoSidebar = ({ contact, open, onOpenChange }: UserInfoSidebarProps) => {
  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-80">
        <SheetHeader>
          <SheetTitle>Contact Info</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Profile Section */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-20 w-20">
              <AvatarImage src={contact.avatar_url || ''} />
              <AvatarFallback className="text-xl">
                {contact.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold">{contact.username}</h3>
              <Badge variant={contact.is_online ? "default" : "secondary"} className="mt-1">
                {contact.is_online ? 'Online' : 'Offline'}
              </Badge>
            </div>
            
            {contact.status && (
              <p className="text-sm text-muted-foreground italic text-center px-4">
                {contact.status}
              </p>
            )}
          </div>

          <Separator />

          {/* Contact Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Contact Details</h4>
            
            {contact.phone_number && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm">{contact.phone_number}</p>
                </div>
              </div>
            )}
            
            {contact.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm break-all">{contact.email}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Personal Info */}
          {(contact.age || contact.gender) && (
            <>
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Personal Info</h4>
                
                {contact.age && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Age</p>
                      <p className="text-sm">{contact.age} years old</p>
                    </div>
                  </div>
                )}
                
                {contact.gender && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="text-sm capitalize">{contact.gender}</p>
                    </div>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Activity Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Activity</h4>
            
            <div className="flex items-start gap-3">
              <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Last Seen</p>
                <p className="text-sm">
                  {contact.is_online 
                    ? 'Active now' 
                    : contact.last_seen 
                      ? format(new Date(contact.last_seen), 'MMM d, yyyy \'at\' h:mm a')
                      : 'Recently'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm">
                  {contact.created_at 
                    ? format(new Date(contact.created_at), 'MMMM yyyy')
                    : 'Recently joined'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
