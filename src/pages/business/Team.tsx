import { useState, createElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, UserPlus, MoreVertical, Crown, 
  Shield, User, Mail, MessageSquare 
} from 'lucide-react';

export default function BusinessTeam() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Demo team data
  const teamMembers = [
    {
      id: 1,
      name: 'You',
      email: 'owner@business.com',
      role: 'owner',
      avatar: 'Y',
      joinedAt: '2024-01-15',
      conversations: 24,
      status: 'online'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah@business.com',
      role: 'admin',
      avatar: 'SJ',
      joinedAt: '2024-02-01',
      conversations: 18,
      status: 'online'
    },
    {
      id: 3,
      name: 'Mike Chen',
      email: 'mike@business.com',
      role: 'agent',
      avatar: 'MC',
      joinedAt: '2024-03-10',
      conversations: 12,
      status: 'offline'
    }
  ];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      default: return User;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b glass-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5" />
        <div className="max-w-7xl mx-auto px-4 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in">
              <h1 className="text-3xl font-bold">Team Management</h1>
              <p className="text-muted-foreground mt-1">Manage your team members and permissions</p>
            </div>
            <Button 
              onClick={() => setShowInviteDialog(true)}
              className="animate-fade-in hover:shadow-glow transition-all"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {teamMembers.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {teamMembers.filter(m => m.status === 'online').length} online now
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <MessageSquare className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {teamMembers.reduce((sum, m) => sum + m.conversations, 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total conversations handled
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plan Limit</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                1 / 1
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upgrade to add more members
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Team Members List */}
        <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <Badge variant="outline">Demo Data</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.map((member, i) => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg glass hover:shadow-glow transition-all"
                  style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarFallback className="bg-gradient-hero text-white font-semibold">
                          {member.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${
                        member.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{member.name}</h3>
                        <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                          {createElement(getRoleIcon(member.role), { className: "h-3 w-3 mr-1 inline" })}
                          {member.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          {member.conversations} conversations
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" className="hover:bg-accent/10">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Info */}
        <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Owner</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Full access to all features</li>
                  <li>• Manage team & billing</li>
                  <li>• Delete business account</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border border-accent/20 bg-accent/5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold">Admin</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Manage conversations</li>
                  <li>• Invite team members</li>
                  <li>• View analytics</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border border-muted bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Agent</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Handle conversations</li>
                  <li>• View customer info</li>
                  <li>• Create notes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
