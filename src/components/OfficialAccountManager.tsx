import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Send, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  is_verified: boolean;
  follower_count: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  post_type: string;
  is_published: boolean;
  view_count: number;
  like_count: number;
  created_at: string;
}

export const OfficialAccountManager = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [active, setActive] = useState<Account | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'article' | 'announcement' | 'image' | 'video'>('article');
  const [submitting, setSubmitting] = useState(false);

  // Create account state
  const [acctName, setAcctName] = useState('');
  const [acctType, setAcctType] = useState<'service' | 'subscription' | 'community'>('service');
  const [acctDesc, setAcctDesc] = useState('');

  useEffect(() => { loadMyAccounts(); }, []);
  useEffect(() => { if (active) loadPosts(active.id); }, [active]);

  const loadMyAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('official_accounts')
      .select('id, account_name, account_type, is_verified, follower_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const list = (data as any[]) || [];
    setAccounts(list);
    if (list.length && !active) setActive(list[0]);
    setLoading(false);
  };

  const loadPosts = async (accountId: string) => {
    const { data } = await (supabase as any)
      .from('official_account_posts')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    setPosts((data as Post[]) || []);
  };

  const createAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !acctName.trim()) return;
    const { data, error } = await supabase
      .from('official_accounts')
      .insert({
        user_id: user.id,
        account_name: acctName.trim(),
        account_type: acctType,
        description: acctDesc.trim() || null,
      } as any)
      .select()
      .single();
    if (error) { toast.error('Could not create account'); return; }
    setCreateAccountOpen(false);
    setAcctName(''); setAcctDesc('');
    toast.success('Account created. Awaiting verification.');
    await loadMyAccounts();
    if (data) setActive(data as any);
  };

  const publishPost = async () => {
    if (!active || !title.trim() || !content.trim()) return;
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from('official_account_posts')
      .insert({
        account_id: active.id,
        title: title.trim(),
        content: content.trim(),
        post_type: postType,
        is_published: true,
      });
    setSubmitting(false);
    if (error) { toast.error('Could not publish'); return; }
    setComposeOpen(false);
    setTitle(''); setContent('');
    toast.success('Post published');
    loadPosts(active.id);
  };

  const deletePost = async (postId: string) => {
    const { error } = await (supabase as any)
      .from('official_account_posts')
      .delete()
      .eq('id', postId);
    if (!error && active) {
      toast.success('Deleted');
      loadPosts(active.id);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  if (accounts.length === 0) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">You don't have an official account yet.</p>
        <Button onClick={() => setCreateAccountOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Official Account
        </Button>
        <CreateDialog
          open={createAccountOpen}
          onOpenChange={setCreateAccountOpen}
          acctName={acctName} setAcctName={setAcctName}
          acctType={acctType} setAcctType={setAcctType}
          acctDesc={acctDesc} setAcctDesc={setAcctDesc}
          onSubmit={createAccount}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Account selector */}
      <div className="flex gap-2 flex-wrap items-center">
        {accounts.map(a => (
          <Button
            key={a.id}
            size="sm"
            variant={active?.id === a.id ? 'default' : 'outline'}
            onClick={() => setActive(a)}
            className="gap-2"
          >
            {a.account_name}
            {a.is_verified && <CheckCircle className="h-3.5 w-3.5 text-blue-500" />}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setCreateAccountOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {active && (
        <>
          <Card className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{active.account_name}</h3>
                <Badge variant="outline" className="capitalize">{active.account_type}</Badge>
                {!active.is_verified && <Badge variant="secondary">Pending verification</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {active.follower_count.toLocaleString()} followers
              </p>
            </div>
            <Button onClick={() => setComposeOpen(true)} className="gap-2">
              <Send className="h-4 w-4" /> New Post
            </Button>
          </Card>

          {/* Posts list */}
          <div className="space-y-2">
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No posts yet. Publish your first.</p>
            ) : posts.map(p => (
              <Card key={p.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize text-[10px]">{p.post_type}</Badge>
                      {!p.is_published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                    </div>
                    <h4 className="font-medium text-sm truncate">{p.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {p.view_count} views · {p.like_count} likes
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deletePost(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Compose dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Post</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={postType} onValueChange={(v: any) => setPostType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            <Textarea placeholder="Write your post…" value={content} onChange={(e) => setContent(e.target.value)} rows={6} maxLength={4000} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={publishPost} disabled={submitting || !title.trim() || !content.trim()}>
              {submitting ? 'Publishing…' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
        acctName={acctName} setAcctName={setAcctName}
        acctType={acctType} setAcctType={setAcctType}
        acctDesc={acctDesc} setAcctDesc={setAcctDesc}
        onSubmit={createAccount}
      />
    </div>
  );
};

const CreateDialog = ({ open, onOpenChange, acctName, setAcctName, acctType, setAcctType, acctDesc, setAcctDesc, onSubmit }: any) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Create Official Account</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Input placeholder="Account name" value={acctName} onChange={(e: any) => setAcctName(e.target.value)} />
        <Select value={acctType} onValueChange={setAcctType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="community">Community</SelectItem>
          </SelectContent>
        </Select>
        <Textarea placeholder="Description" value={acctDesc} onChange={(e: any) => setAcctDesc(e.target.value)} rows={3} maxLength={300} />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!acctName.trim()}>Create</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
