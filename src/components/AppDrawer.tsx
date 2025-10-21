import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Search, MessageSquare, Heart, ShoppingBag, Users, Grid3x3, 
  Zap, Briefcase, Calendar, Settings, BookOpen, Camera,
  Phone, Map, Music, Video, FileText, TrendingUp, Award,
  Gift, Bell, Shield, HelpCircle, Wallet
} from "lucide-react";
import { HoverLift, StaggerChildren, StaggerItem } from "@/components/PremiumAnimations";

interface App {
  id: string;
  name: string;
  icon: any;
  route: string;
  category: "communication" | "health" | "commerce" | "social" | "productivity" | "entertainment" | "tools";
  color: string;
  description: string;
  badge?: number;
}

const apps: App[] = [
  // Communication
  { id: "chat", name: "Messages", icon: MessageSquare, route: "/chat", category: "communication", color: "from-blue-500 to-cyan-500", description: "Chat with friends", badge: 3 },
  { id: "calls", name: "Call History", icon: Phone, route: "/call-history", category: "communication", color: "from-green-500 to-emerald-500", description: "View call logs" },
  { id: "contacts", name: "Contacts", icon: Users, route: "/contacts", category: "communication", color: "from-purple-500 to-violet-500", description: "Manage contacts" },
  
  // Health
  { id: "health", name: "Health Hub", icon: Heart, route: "/health-hub", category: "health", color: "from-red-500 to-pink-500", description: "Your health center" },
  { id: "passport", name: "Health Passport", icon: FileText, route: "/health-passport", category: "health", color: "from-pink-500 to-rose-500", description: "Medical records" },
  { id: "wellness", name: "Wellness", icon: TrendingUp, route: "/wellness-tracking", category: "health", color: "from-orange-500 to-red-500", description: "Track wellness" },
  
  // Commerce
  { id: "marketplace", name: "Marketplace", icon: ShoppingBag, route: "/marketplace", category: "commerce", color: "from-purple-500 to-violet-500", description: "Shop online" },
  { id: "rewards", name: "Reward Shop", icon: Gift, route: "/reward-shop", category: "commerce", color: "from-yellow-500 to-orange-500", description: "Redeem rewards" },
  { id: "wallet", name: "Wallet", icon: Wallet, route: "/health-wallet", category: "commerce", color: "from-green-500 to-teal-500", description: "Your digital wallet" },
  
  // Social
  { id: "communities", name: "Communities", icon: Users, route: "/communities", category: "social", color: "from-green-500 to-emerald-500", description: "Join groups" },
  { id: "stories", name: "Stories", icon: Camera, route: "/stories", category: "social", color: "from-pink-500 to-purple-500", description: "Share moments" },
  { id: "official", name: "Official Accounts", icon: Award, route: "/official-accounts", category: "social", color: "from-blue-500 to-indigo-500", description: "Follow brands" },
  
  // Productivity
  { id: "miniapps", name: "Mini Apps", icon: Grid3x3, route: "/mini-apps-store", category: "productivity", color: "from-orange-500 to-amber-500", description: "Discover apps" },
  { id: "growth", name: "Growth", icon: Zap, route: "/chatr-growth", category: "productivity", color: "from-yellow-500 to-orange-500", description: "Earn & learn" },
  { id: "points", name: "Points", icon: TrendingUp, route: "/chatr-points", category: "productivity", color: "from-purple-500 to-pink-500", description: "Your points" },
  
  // Entertainment
  { id: "youth", name: "Youth Feed", icon: Video, route: "/youth-feed", category: "entertainment", color: "from-red-500 to-orange-500", description: "Trending content" },
  { id: "tutors", name: "Tutors", icon: BookOpen, route: "/chatr-tutors", category: "entertainment", color: "from-blue-500 to-cyan-500", description: "Learn new skills" },
  
  // Tools
  { id: "settings", name: "Settings", icon: Settings, route: "/account", category: "tools", color: "from-gray-500 to-slate-500", description: "App settings" },
  { id: "notifications", name: "Notifications", icon: Bell, route: "/notifications", category: "tools", color: "from-indigo-500 to-blue-500", description: "Your alerts", badge: 5 },
  { id: "help", name: "Help", icon: HelpCircle, route: "/help", category: "tools", color: "from-cyan-500 to-blue-500", description: "Get support" },
];

const categories = [
  { id: "all", name: "All Apps", icon: Grid3x3 },
  { id: "communication", name: "Communication", icon: MessageSquare },
  { id: "health", name: "Health", icon: Heart },
  { id: "commerce", name: "Commerce", icon: ShoppingBag },
  { id: "social", name: "Social", icon: Users },
  { id: "productivity", name: "Productivity", icon: Briefcase },
  { id: "entertainment", name: "Entertainment", icon: Music },
  { id: "tools", name: "Tools", icon: Settings },
];

interface AppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AppDrawer = ({ open, onOpenChange }: AppDrawerProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAppClick = (route: string) => {
    navigate(route);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl glass-effect border-t border-white/10">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl font-bold text-foreground">App Drawer</SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps..."
            className="pl-10 glass-input border-white/10"
          />
        </div>

        {/* Categories */}
        <ScrollArea className="mb-4">
          <div className="flex gap-2 pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? "bg-primary text-white shadow-glow"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                <category.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Apps Grid */}
        <ScrollArea className="h-[calc(90vh-200px)]">
          <StaggerChildren className="grid grid-cols-4 gap-4 pb-6">
            {filteredApps.map((app) => (
              <StaggerItem key={app.id}>
                <HoverLift>
                  <button
                    onClick={() => handleAppClick(app.route)}
                    className="flex flex-col items-center gap-2 w-full group"
                  >
                    <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${app.color} shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl w-full aspect-square flex items-center justify-center`}>
                      <app.icon className="h-7 w-7 text-white" />
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

          {filteredApps.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No apps found</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
