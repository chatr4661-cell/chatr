import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Send, CheckCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

interface OfficialAccount {
  id: string;
  account_name: string;
  follower_count: number;
  logo_url: string;
}

const BroadcastManager = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<OfficialAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [message, setMessage] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('official_accounts')
      .select('id, account_name, follower_count, logo_url')
      .eq('is_verified', true)
      .order('follower_count', { ascending: false });
    if (data) setAccounts(data as OfficialAccount[]);
  };

  const sendBroadcast = async () => {
    if (!selectedAccount || !message) {
      toast.error('Please select an account and enter a message');
      return;
    }

    setIsSending(true);

    try {
      // Get all followers of this account
      const { data: followers } = await supabase
        .from('account_followers')
        .select('user_id')
        .eq('account_id', selectedAccount);

      if (!followers || followers.length === 0) {
        toast.error('No followers to send to');
        setIsSending(false);
        return;
      }

      // Create or find conversation with each follower
      for (const follower of followers) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) continue;

        // Find existing conversation
        const { data: existingConv } = await supabase.rpc('find_shared_conversation', {
          user1_id: user.id,
          user2_id: follower.user_id
        });

        let conversationId = existingConv;

        // Create conversation if doesn't exist
        if (!conversationId) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              created_by: user.id,
              is_group: false
            })
            .select('id')
            .single();

          if (newConv) {
            conversationId = newConv.id;

            // Add participants
            await supabase.from('conversation_participants').insert([
              { conversation_id: conversationId, user_id: user.id },
              { conversation_id: conversationId, user_id: follower.user_id }
            ]);
          }
        }

        if (conversationId) {
          // Format message with job details if it's a job post
          let finalMessage = message;
          if (jobTitle && jobUrl) {
            finalMessage = `🔔 New Job Alert!\n\n📌 ${jobTitle}\n\n${message}\n\n🔗 Apply: ${jobUrl}`;
          }

          // Send message
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: finalMessage,
            message_type: 'text'
          });
        }
      }

      toast.success(`Broadcast sent to ${followers.length} followers!`);
      setMessage('');
      setJobTitle('');
      setJobUrl('');
    } catch (error) {
      console.error('Broadcast error:', error);
      toast.error('Failed to send broadcast');
    } finally {
      setIsSending(false);
    }
  };

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Broadcast Messages</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <Card className="p-6">
          <div className="space-y-6">
            {/* Account Selection */}
            <div>
              <Label>Select Official Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose account to broadcast from" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        {account.logo_url && (
                          <img src={account.logo_url} alt="" className="w-5 h-5 rounded-full" />
                        )}
                        <span>{account.account_name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({account.follower_count} followers)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAccountData && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  {selectedAccountData.logo_url && (
                    <img 
                      src={selectedAccountData.logo_url} 
                      alt={selectedAccountData.account_name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{selectedAccountData.account_name}</h3>
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{selectedAccountData.follower_count} followers will receive this</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Job Post Fields (Optional) */}
            {selectedAccount && accounts.find(a => a.id === selectedAccount)?.account_name.includes('Jobs') && (
              <>
                <div>
                  <Label>Job Title (Optional)</Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer - Remote"
                  />
                </div>

                <div>
                  <Label>Job URL (Optional)</Label>
                  <Input
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://talentxcel.in/jobs/..."
                  />
                </div>
              </>
            )}

            {/* Message */}
            <div>
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder={
                  jobTitle 
                    ? "Add job description, requirements, etc..."
                    : "Write your broadcast message..."
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length} characters
              </p>
            </div>

            {/* Send Button */}
            <Button
              onClick={sendBroadcast}
              disabled={!selectedAccount || !message || isSending}
              className="w-full"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? 'Sending...' : `Send to ${selectedAccountData?.follower_count || 0} Followers`}
            </Button>
          </div>
        </Card>

        {/* Tips */}
        <Card className="p-4 mt-4 bg-muted/50">
          <h3 className="font-semibold mb-2">💡 Broadcast Tips</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Keep messages concise and valuable</li>
            <li>• For jobs: Include title, key requirements, and direct apply link</li>
            <li>• Messages appear in 1-on-1 chats with followers</li>
            <li>• Users can reply directly to official accounts</li>
            <li>• Use this feature responsibly - avoid spam</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default BroadcastManager;
