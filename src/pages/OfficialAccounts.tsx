import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Users, CheckCircle, Building2, Heart, Newspaper } from 'lucide-react';
import { toast } from 'sonner';

interface OfficialAccount {
  id: string;
  account_name: string;
  account_type: 'service' | 'subscription' | 'community';
  description: string;
  logo_url: string;
  is_verified: boolean;
  follower_count: number;
  category: string;
}

const OfficialAccounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<OfficialAccount[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAccounts();
    loadFollowing();
  }, [selectedType]);

  const loadAccounts = async () => {
    let query = supabase
      .from('official_accounts')
      .select('*')
      .eq('is_verified', true);

    if (selectedType !== 'all') {
      query = query.eq('account_type', selectedType);
    }

    const { data } = await query.order('follower_count', { ascending: false });
    if (data) setAccounts(data as OfficialAccount[]);
  };

  const loadFollowing = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('account_followers')
      .select('account_id')
      .eq('user_id', user.id);

    if (data) {
      setFollowing(new Set(data.map(item => item.account_id)));
    }
  };

  const toggleFollow = async (accountId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please login to follow accounts');
      return;
    }

    if (following.has(accountId)) {
      await supabase
        .from('account_followers')
        .delete()
        .eq('user_id', user.id)
        .eq('account_id', accountId);
      
      setFollowing(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
      toast.success('Unfollowed');
    } else {
      await supabase
        .from('account_followers')
        .insert({ user_id: user.id, account_id: accountId });
      
      setFollowing(prev => new Set([...prev, accountId]));
      toast.success('Following!');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'service': return <Building2 className="w-4 h-4" />;
      case 'subscription': return <Newspaper className="w-4 h-4" />;
      case 'community': return <Heart className="w-4 h-4" />;
      default: return null;
    }
  };

  const filteredAccounts = accounts.filter(acc =>
    acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center gap-3 p-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Official Accounts</h1>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4 max-w-7xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Account Types */}
        <Tabs value={selectedType} onValueChange={setSelectedType} className="mb-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="service">
              <Building2 className="w-4 h-4 mr-1" />
              Service
            </TabsTrigger>
            <TabsTrigger value="subscription">
              <Newspaper className="w-4 h-4 mr-1" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="community">
              <Heart className="w-4 h-4 mr-1" />
              Community
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account) => (
            <Card key={account.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  {account.logo_url ? (
                    <img src={account.logo_url} alt={account.account_name} className="w-14 h-14 rounded-full" />
                  ) : (
                    getTypeIcon(account.account_type)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold truncate">{account.account_name}</h3>
                    {account.is_verified && (
                      <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    )}
                  </div>

                  <Badge variant="outline" className="mt-1">
                    {getTypeIcon(account.account_type)}
                    <span className="ml-1 capitalize">{account.account_type}</span>
                  </Badge>

                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {account.description}
                  </p>

                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{account.follower_count.toLocaleString()} followers</span>
                  </div>

                  <Button
                    size="sm"
                    variant={following.has(account.id) ? 'outline' : 'default'}
                    onClick={() => toggleFollow(account.id)}
                    className="w-full mt-3"
                  >
                    {following.has(account.id) ? 'Following' : 'Follow'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OfficialAccounts;
