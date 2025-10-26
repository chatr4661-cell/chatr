import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Settings, 
  Send, 
  UserCheck, 
  Building2, 
  Coins, 
  Sparkles,
  LogOut
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Announcements", url: "/admin/announcements", icon: Megaphone },
  { title: "Payments", url: "/admin/payments", icon: DollarSign },
  { title: "Documents", url: "/admin/documents", icon: FileText },
  { title: "Broadcast", url: "/admin/broadcast", icon: Send },
  { title: "Doctor Apps", url: "/admin/doctor-applications", icon: UserCheck },
  { title: "Official Accounts", url: "/admin/official-accounts", icon: Building2 },
  { title: "Providers", url: "/admin/providers", icon: Building2 },
  { title: "Points System", url: "/admin/points", icon: Coins },
  { title: "Brand Partnerships", url: "/admin/brand-partnerships", icon: Sparkles },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"}>
      <SidebarContent className="bg-background border-r">
        <div className="p-4 border-b">
          <h2 className={`font-bold text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent ${collapsed ? "hidden" : ""}`}>
            Admin Portal
          </h2>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "hidden" : ""}>
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background/80 backdrop-blur-xl sticky top-0 z-40">
            <SidebarTrigger className="ml-4" />
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
