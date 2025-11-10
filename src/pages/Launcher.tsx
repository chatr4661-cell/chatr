import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Grid3x3, Plus, Settings, User, MessageSquare, Heart, ShoppingBag, Briefcase, Users, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FadeIn, SlideIn, StaggerChildren, StaggerItem, HoverLift } from "@/components/PremiumAnimations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Widget {
  id: string;
  type: "quick-stats" | "recent-chats" | "points" | "mini-apps";
  title: string;
  size: "small" | "medium" | "large";
}

interface AppShortcut {
  id: string;
  name: string;
  icon: any;
  route: string;
  color: string;
  badge?: number;
}

const Launcher = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: "1", type: "quick-stats", title: "Quick Stats", size: "small" },
    { id: "2", type: "recent-chats", title: "Recent Chats", size: "medium" },
    { id: "3", type: "points", title: "Chatr Points", size: "small" },
  ]);

  const [apps] = useState<AppShortcut[]>([
    { id: "chat", name: "Messages", icon: MessageSquare, route: "/chat", color: "from-blue-500 to-cyan-500", badge: 3 },
    { id: "chatr-plus", name: "Chatr+", icon: Zap, route: "/chatr-plus", color: "from-amber-500 to-orange-500" },
    { id: "health", name: "Health Hub", icon: Heart, route: "/health-hub", color: "from-red-500 to-pink-500" },
    { id: "marketplace", name: "Marketplace", icon: ShoppingBag, route: "/marketplace", color: "from-purple-500 to-violet-500" },
    { id: "community", name: "Communities", icon: Users, route: "/communities", color: "from-green-500 to-emerald-500" },
    { id: "miniapps", name: "Mini Apps", icon: Grid3x3, route: "/mini-apps-store", color: "from-orange-500 to-amber-500" },
    { id: "growth", name: "Growth", icon: Briefcase, route: "/chatr-growth", color: "from-yellow-500 to-orange-500" },
  ]);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setUser(profile);
      }
    };
    loadUser();
  }, []);

  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-subtle to-background pb-20">
      {/* Status Bar */}
      <div className="sticky top-0 z-50 glass-effect border-b border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white text-xs">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{user?.username || "User"}</p>
              <p className="text-xs text-muted-foreground">Chatr OS</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/account")}
            className="rounded-full hover:bg-white/5"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <FadeIn className="px-4 pt-6 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps, chats, people..."
            className="pl-10 h-12 glass-input border-white/10 text-base"
          />
        </div>
      </FadeIn>

      {/* Widgets Section */}
      {!searchQuery && (
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Widgets</h2>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <StaggerChildren className="grid grid-cols-2 gap-3">
            <StaggerItem>
              <HoverLift>
                <Card className="glass-card p-4 border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                      <MessageSquare className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Messages</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-1">12</p>
                  <p className="text-xs text-muted-foreground">Unread chats</p>
                </Card>
              </HoverLift>
            </StaggerItem>
            <StaggerItem>
              <HoverLift>
                <Card className="glass-card p-4 border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                      <Zap className="h-4 w-4 text-yellow-400" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Points</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-1">2,450</p>
                  <p className="text-xs text-muted-foreground">Chatr coins</p>
                </Card>
              </HoverLift>
            </StaggerItem>
          </StaggerChildren>
        </div>
      )}

      {/* App Grid */}
      <div className="px-4 pb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {searchQuery ? "Search Results" : "Your Apps"}
        </h2>
        <StaggerChildren className="grid grid-cols-4 gap-4">
          {filteredApps.map((app) => (
            <StaggerItem key={app.id}>
              <HoverLift>
                <button
                  onClick={() => navigate(app.route)}
                  className="flex flex-col items-center gap-2 w-full group"
                >
                  <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${app.color} shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}>
                    <app.icon className="h-6 w-6 text-white" />
                    {app.badge && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs border-2 border-background">
                        {app.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-center text-foreground font-medium line-clamp-2 max-w-full">
                    {app.name}
                  </span>
                </button>
              </HoverLift>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>

      {/* Quick Actions Dock */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
        <SlideIn direction="bottom">
          <Card className="glass-card border-white/10 p-3 mx-auto max-w-md">
            <div className="flex items-center justify-around">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/chat")}
                className="rounded-full hover:bg-white/10 relative"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/contacts")}
                className="rounded-full hover:bg-white/10"
              >
                <Users className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/mini-apps-store")}
                className="rounded-full hover:bg-white/10"
              >
                <Grid3x3 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/account")}
                className="rounded-full hover:bg-white/10"
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        </SlideIn>
      </div>
    </div>
  );
};

export default Launcher;
