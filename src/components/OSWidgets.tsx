import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, TrendingUp, Users, Zap, Calendar, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HoverLift } from "@/components/PremiumAnimations";

interface RecentChat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
}

export const RecentChatsWidget = ({ chats }: { chats: RecentChat[] }) => {
  const navigate = useNavigate();

  return (
    <Card className="glass-card border-white/10 p-4 col-span-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Recent Chats</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/chat")}>
          View all
        </Button>
      </div>
      <div className="space-y-3">
        {chats.slice(0, 3).map((chat) => (
          <HoverLift key={chat.id}>
            <button
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={chat.avatar} />
                <AvatarFallback>{chat.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm text-foreground">{chat.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && (
                <div className="h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                  {chat.unread}
                </div>
              )}
            </button>
          </HoverLift>
        ))}
      </div>
    </Card>
  );
};

export const PointsWidget = ({ points, streak }: { points: number; streak: number }) => {
  const navigate = useNavigate();

  return (
    <Card className="glass-card border-white/10 p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
          <Zap className="h-4 w-4 text-yellow-400" />
        </div>
        <h3 className="font-semibold text-foreground">Chatr Points</h3>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-2xl font-bold text-foreground">{points.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Available coins</p>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <TrendingUp className="h-3 w-3 text-green-400" />
          <p className="text-xs text-muted-foreground">{streak} day streak</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-3 text-primary hover:text-primary/80"
        onClick={() => navigate("/chatr-points")}
      >
        View details
      </Button>
    </Card>
  );
};

export const ActivityWidget = ({ activities }: { activities: any[] }) => {
  return (
    <Card className="glass-card border-white/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
      </div>
      <div className="space-y-2">
        {activities.slice(0, 3).map((activity, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
            <div>
              <p className="text-foreground">{activity.text}</p>
              <p className="text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const CommunityWidget = ({ communities }: { communities: any[] }) => {
  const navigate = useNavigate();

  return (
    <Card className="glass-card border-white/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Communities</h3>
      </div>
      <div className="space-y-2">
        {communities.slice(0, 2).map((community) => (
          <HoverLift key={community.id}>
            <button
              onClick={() => navigate(`/communities/${community.id}`)}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={community.icon} />
                <AvatarFallback>{community.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{community.name}</p>
                <p className="text-xs text-muted-foreground">{community.members} members</p>
              </div>
            </button>
          </HoverLift>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 text-primary hover:text-primary/80"
        onClick={() => navigate("/communities")}
      >
        Explore more
      </Button>
    </Card>
  );
};

export const UpcomingEventsWidget = ({ events }: { events: any[] }) => {
  return (
    <Card className="glass-card border-white/10 p-4 col-span-2">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Upcoming Events</h3>
      </div>
      <div className="space-y-2">
        {events.slice(0, 2).map((event, i) => (
          <HoverLift key={i}>
            <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{event.date}</p>
            </div>
          </HoverLift>
        ))}
      </div>
    </Card>
  );
};
