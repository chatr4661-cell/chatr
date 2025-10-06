import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, Heart, Stethoscope, ArrowRight, Menu } from "lucide-react";
import { PointsWallet } from "@/components/PointsWallet";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    checkUser();
    loadUnreadCount();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);
  };

  const loadUnreadCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: conversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!conversations) return;

    const conversationIds = conversations.map(c => c.conversation_id);
    
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .is('read_at', null)
      .neq('sender_id', user.id);

    setUnreadMessages(count || 0);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Chatr
              </h1>
              <p className="text-xs text-muted-foreground">Your Super App</p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="space-y-4 mt-8">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/profile')}>
                    Profile Settings
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/contacts')}>
                    Contacts
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/chatr-points')}>
                    Points History
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/health-passport')}>
                    Health Passport
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Main Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Chat Section */}
          <Card 
            className="md:col-span-2 p-6 cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background border-blue-500/20"
            onClick={() => navigate('/chat')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Messages</h2>
                  <p className="text-sm text-muted-foreground">Chat & Connect</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {unreadMessages > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-600">
                  {unreadMessages} unread message{unreadMessages !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>✓ Text & Voice</div>
              <div>✓ Video Calls</div>
              <div>✓ AI Tools</div>
            </div>
          </Card>

          {/* Points Wallet Section */}
          <div>
            <PointsWallet />
          </div>
        </div>

        {/* Healthcare Section */}
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-green-500/10 via-green-500/5 to-background border-green-500/20"
          onClick={() => navigate('/marketplace')}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Stethoscope className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Chatr Care</h2>
                <p className="text-sm text-muted-foreground">Healthcare Services</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col py-4 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/booking');
              }}
            >
              <Heart className="h-5 w-5 text-green-600" />
              <span className="text-xs">Book Doctor</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-4 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/health-passport');
              }}
            >
              <Heart className="h-5 w-5 text-green-600" />
              <span className="text-xs">Health Passport</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-4 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/lab-reports');
              }}
            >
              <Heart className="h-5 w-5 text-green-600" />
              <span className="text-xs">Lab Reports</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-4 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/medicine-reminders');
              }}
            >
              <Heart className="h-5 w-5 text-green-600" />
              <span className="text-xs">Medicines</span>
            </Button>
          </div>

          <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
            <p className="text-xs text-green-600 font-medium">
              💡 Pay with Chatr Points - No wallet needed!
            </p>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/qr-payment')}
          >
            <div className="text-2xl">📱</div>
            <span className="text-sm">QR Pay</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/youth-feed')}
          >
            <div className="text-2xl">🎯</div>
            <span className="text-sm">Youth Feed</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/ai-assistant')}
          >
            <div className="text-2xl">🤖</div>
            <span className="text-sm">AI Assistant</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/wellness-tracking')}
          >
            <div className="text-2xl">💪</div>
            <span className="text-sm">Wellness</span>
          </Button>
        </div>
      </div>
    </div>
  );
}