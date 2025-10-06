import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin, Calendar, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
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

interface UserProfileDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserProfileDialog = ({ user, open, onOpenChange }: UserProfileDialogProps) => {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback className="text-2xl">
                {user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold">{user.username}</h2>
              {user.status && (
                <p className="text-sm text-muted-foreground italic mt-1">{user.status}</p>
              )}
              <Badge variant={user.is_online ? "default" : "secondary"} className="mt-2">
                {user.is_online ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Contact Info</h3>
            
            {user.phone_number && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{user.phone_number}</span>
              </div>
            )}
            
            {user.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
            )}
          </div>

          {/* Personal Information */}
          {(user.age || user.gender) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Personal Info</h3>
              
              {user.age && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{user.age} years old</span>
                </div>
              )}
              
              {user.gender && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{user.gender}</span>
                </div>
              )}
            </div>
          )}

          {/* Activity */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Activity</h3>
            
            <div className="flex items-center gap-3 text-sm">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span>
                {user.is_online 
                  ? 'Active now' 
                  : (() => {
                      try {
                        if (!user.last_seen) return 'Last seen recently';
                        const date = new Date(user.last_seen);
                        if (isNaN(date.getTime())) return 'Last seen recently';
                        return `Last seen ${format(date, 'MMM d, yyyy \'at\' h:mm a')}`;
                      } catch {
                        return 'Last seen recently';
                      }
                    })()
                }
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {(() => {
                  try {
                    if (!user.created_at) return 'Member';
                    const date = new Date(user.created_at);
                    if (isNaN(date.getTime())) return 'Member';
                    return `Joined ${format(date, 'MMMM yyyy')}`;
                  } catch {
                    return 'Member';
                  }
                })()}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
