import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, User, Calendar } from 'lucide-react';
import { LocationPresenceBadge } from '@/components/LocationPresenceBadge';

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
  location_city?: string | null;
  location_country?: string | null;
  location_sharing_enabled?: boolean | null;
  location_precision?: 'exact' | 'city' | 'off' | null;
  last_seen_at?: string | null;
}

interface UserProfileDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserProfileDialog = ({ user, open, onOpenChange }: UserProfileDialogProps) => {
  if (!user) return null;

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-accent/10 to-background p-8 pb-16">
          <DialogHeader className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-28 w-28 ring-4 ring-background shadow-xl">
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-3xl font-bold">
                    {user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.is_online && (
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-background shadow-glow" />
                )}
              </div>
              
              <div className="text-center space-y-2">
                <DialogTitle className="text-2xl font-bold">{user.username}</DialogTitle>
                {user.status && (
                  <p className="text-sm text-muted-foreground italic max-w-xs">
                    {user.status}
                  </p>
                )}
                <Badge variant={user.is_online ? "default" : "secondary"} className="mt-2">
                  {user.is_online ? 'Online' : 'Offline'}
                </Badge>
                
                {/* Location Presence */}
                <LocationPresenceBadge
                  city={user.location_city || undefined}
                  country={user.location_country || undefined}
                  lastSeenAt={user.last_seen_at || undefined}
                  locationSharingEnabled={user.location_sharing_enabled ?? true}
                  locationPrecision={(user.location_precision as 'exact' | 'city' | 'off') || 'city'}
                  showLastSeen={true}
                  compact={false}
                  className="justify-center"
                />
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Contact Info
            </h3>
            <div className="space-y-3">
              {user.phone_number && !user.phone_number.startsWith('+000') && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{user.phone_number}</p>
                  </div>
                </div>
              )}
              {user.email && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Personal Info */}
          {(user.age || user.gender) && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Personal Info
                </h3>
                <div className="space-y-3">
                  {user.age && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <User className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{user.age} years old</p>
                      </div>
                    </div>
                  )}
                  {user.gender && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <User className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium capitalize">{user.gender}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Activity */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Activity
            </h3>
            <div className="space-y-3">
              {user.created_at && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Joined {formatJoinDate(user.created_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
