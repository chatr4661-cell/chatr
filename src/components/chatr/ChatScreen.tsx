import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Video, Send, Paperclip, Mic, Search, Pin, Image, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageReactionPicker } from '../chat/MessageReactionPicker';
import { MessageReactions } from '../MessageReactions';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { useReliableMessages, Message } from '@/hooks/useReliableMessages';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatContext } from '@/contexts/ChatContext';

interface ChatScreenProps {
  chatId: string;
  chatName: string;
  userId: string;
}

export function ChatScreen({ chatId, chatName, userId }: ChatScreenProps) {
  const navigate = useNavigate();
  const { isUserOnline } = useChatContext();
  const { 
    messages, 
    isLoading, 
    sending, 
    sendMessage, 
    editMessage, 
    deleteMessage,
    reactToMessage,
    setTyping 
  } = useReliableMessages(chatId, userId);
  
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Compute online status from real-time presence
  const isOnline = otherUser?.id ? isUserOnline(otherUser.id) : false;

  // Load other participant info
  useEffect(() => {
    const loadOtherUser = async () => {
      const { data } = await supabase
        .from('conversation_participants')
        .select('profiles!inner(id, username, avatar_url, is_online, last_seen)')
        .eq('conversation_id', chatId)
        .neq('user_id', userId)
        .limit(1)
        .single();
      
      if (data) {
        setOtherUser(data.profiles);
      }
    };
    loadOtherUser();
  }, [chatId, userId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setInputText(value);
    setTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    
    const content = inputText.trim();
    setInputText('');
    setReplyingTo(null);
    setTyping(false);
    
    try {
      await sendMessage(content, 'text');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await reactToMessage(messageId, emoji);
  };

  const pinnedMessages = messages.filter(m => (m as any).is_pinned);
  const filteredMessages = searchQuery 
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const getReactionsArray = (reactions: any) => {
    if (!reactions || typeof reactions !== 'object') return [];
    return Object.entries(reactions).map(([emoji, users]: [string, any]) => ({
      emoji,
      count: Array.isArray(users) ? users.length : 0,
      userReacted: Array.isArray(users) && users.includes(userId),
    })).filter(r => r.count > 0);
  };

  return (
    <div className="h-screen flex flex-col bg-background safe-area-inset">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary-glow text-primary-foreground pt-safe shadow-lg">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/chat')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={otherUser?.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-primary-foreground">
                    {(otherUser?.username || chatName)?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-primary" />
                )}
              </div>
              <div>
                <h2 className="font-semibold">{otherUser?.username || chatName}</h2>
                <p className="text-xs opacity-90">
                  {isOnline ? 'Online' : otherUser?.last_seen 
                    ? `Last seen ${formatDistanceToNow(new Date(otherUser.last_seen), { addSuffix: true })}`
                    : 'Offline'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => navigate(`/call/video/${chatId}`)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <Video className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate(`/call/audio/${chatId}`)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setSearchOpen(!searchOpen)} 
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="px-4 pb-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-white/60"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div className="bg-accent/20 border-b border-border px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Pin className="w-4 h-4 text-primary" />
            <span className="font-medium">{pinnedMessages.length} pinned message(s)</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-background to-muted/20">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <Skeleton className="h-16 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Smile className="w-8 h-8 text-primary" />
              </div>
              <p className="font-medium">No messages yet</p>
              <p className="text-sm">Say hello to start the conversation!</p>
            </div>
          </div>
        ) : (
          filteredMessages.map((message) => {
            const isOwn = message.sender_id === userId;
            const reactions = getReactionsArray(message.reactions);
            
            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isOwn 
                  ? 'bg-primary text-primary-foreground rounded-t-2xl rounded-bl-2xl rounded-br-sm' 
                  : 'bg-card text-card-foreground rounded-t-2xl rounded-br-2xl rounded-bl-sm shadow-sm'
                } px-4 py-2`}>
                  
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className={`text-xs ${isOwn ? 'opacity-70' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                    <MessageReactionPicker 
                      onReact={(emoji) => handleReaction(message.id, emoji)}
                      existingReactions={message.reactions || {}}
                      userId={userId}
                    />
                  </div>
                  
                  {reactions.length > 0 && (
                    <div className="mt-2">
                      <MessageReactions
                        reactions={reactions}
                        onReact={(emoji) => handleReaction(message.id, emoji)}
                      />
                    </div>
                  )}
                  
                  <div className={`flex gap-3 mt-2 text-xs ${isOwn ? 'opacity-70' : 'text-muted-foreground'}`}>
                    <button 
                      onClick={() => setReplyingTo(message)} 
                      className="hover:opacity-100 transition-opacity"
                    >
                      Reply
                    </button>
                    <button 
                      onClick={() => setForwardMessage(message)} 
                      className="hover:opacity-100 transition-opacity"
                    >
                      Forward
                    </button>
                    {isOwn && (
                      <button 
                        onClick={() => deleteMessage(message.id)} 
                        className="hover:opacity-100 transition-opacity text-destructive"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="bg-secondary/50 px-4 py-2 border-t border-border flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Replying to</p>
            <p className="text-sm truncate">{replyingTo.content}</p>
          </div>
          <button 
            onClick={() => setReplyingTo(null)} 
            className="text-muted-foreground hover:text-foreground p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4 pb-safe bg-card">
        <div className="flex items-center gap-2">
          <button className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <button className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors">
            <Image className="w-5 h-5" />
          </button>
          <Input
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-muted/50 border-0 focus-visible:ring-1"
          />
          {inputText.trim() ? (
            <button 
              onClick={handleSend} 
              disabled={sending}
              className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors">
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {forwardMessage && (
        <ForwardMessageDialog
          message={forwardMessage}
          onClose={() => setForwardMessage(null)}
          userId={userId}
        />
      )}
    </div>
  );
}
