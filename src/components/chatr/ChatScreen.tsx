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

interface ChatScreenProps {
  chatId: string;
  chatName: string;
  userId: string;
}

export function ChatScreen({ chatId, chatName, userId }: ChatScreenProps) {
  const navigate = useNavigate();
  const { 
    messages, 
    isLoading, 
    sending, 
    sendMessage, 
    editMessage, 
    deleteMessage,
    reactToMessage,
    starMessage,
    pinMessage,
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
      {/* Header - Premium glassmorphism */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary-glow text-primary-foreground pt-safe shadow-xl backdrop-blur-sm">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/chat')} 
              className="p-2 hover:bg-white/15 active:scale-95 rounded-full transition-all duration-200"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-11 h-11 ring-2 ring-white/20 shadow-lg transition-transform hover:scale-105">
                  <AvatarImage src={otherUser?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-white/20 text-primary-foreground font-semibold">
                    {(otherUser?.username || chatName)?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {otherUser?.is_online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full ring-2 ring-primary shadow-lg animate-pulse" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-[15px] tracking-tight">{otherUser?.username || chatName}</h2>
                <p className="text-xs opacity-80 font-medium">
                  {otherUser?.is_online ? 'Online' : otherUser?.last_seen 
                    ? `Last seen ${formatDistanceToNow(new Date(otherUser.last_seen), { addSuffix: true })}`
                    : 'Offline'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button 
              onClick={() => navigate(`/call/video/${chatId}`)}
              className="p-2.5 rounded-full hover:bg-white/15 active:scale-95 transition-all duration-200"
            >
              <Video className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate(`/call/audio/${chatId}`)}
              className="p-2.5 rounded-full hover:bg-white/15 active:scale-95 transition-all duration-200"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setSearchOpen(!searchOpen)} 
              className="p-2.5 rounded-full hover:bg-white/15 active:scale-95 transition-all duration-200"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar - Premium glass effect */}
        {searchOpen && (
          <div className="px-4 pb-3 animate-fade-in">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="bg-white/10 backdrop-blur-md border-white/20 text-primary-foreground placeholder:text-white/60 rounded-xl shadow-inner"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Pinned Messages - Subtle glass */}
      {pinnedMessages.length > 0 && (
        <div className="bg-accent/30 backdrop-blur-sm border-b border-border/50 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1 bg-primary/10 rounded-full">
              <Pin className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-medium">{pinnedMessages.length} pinned message(s)</span>
          </div>
        </div>
      )}

      {/* Messages - Premium background */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-background via-background to-muted/30">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse`}>
                <Skeleton className="h-16 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg">
                <Smile className="w-8 h-8 text-primary" />
              </div>
              <p className="font-medium">No messages yet</p>
              <p className="text-sm">Say hello to start the conversation!</p>
            </div>
          </div>
        ) : (
          filteredMessages.map((message, index) => {
            const isOwn = message.sender_id === userId;
            const reactions = getReactionsArray(message.reactions);
            
            return (
              <div 
                key={message.id} 
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
              >
                <div className={`max-w-[75%] ${isOwn 
                  ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-t-2xl rounded-bl-2xl rounded-br-md shadow-md shadow-primary/20' 
                  : 'bg-card text-card-foreground rounded-t-2xl rounded-br-2xl rounded-bl-md shadow-md border border-border/50'
                } px-4 py-2.5 transition-all duration-200 hover:shadow-lg active:scale-[0.98]`}>
                  
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                  
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <span className={`text-[11px] font-medium ${isOwn ? 'opacity-70' : 'text-muted-foreground'}`}>
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
                  
                  <div className={`flex gap-4 mt-2 text-[11px] font-medium ${isOwn ? 'opacity-70' : 'text-muted-foreground'}`}>
                    <button 
                      onClick={() => setReplyingTo(message)} 
                      className="hover:opacity-100 active:scale-95 transition-all"
                    >
                      Reply
                    </button>
                    <button 
                      onClick={() => setForwardMessage(message)} 
                      className="hover:opacity-100 active:scale-95 transition-all"
                    >
                      Forward
                    </button>
                    {isOwn && (
                      <button 
                        onClick={() => deleteMessage(message.id)} 
                        className="hover:opacity-100 active:scale-95 transition-all text-destructive"
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

      {/* Reply Preview - Refined */}
      {replyingTo && (
        <div className="bg-secondary/60 backdrop-blur-sm px-4 py-2.5 border-t border-border/50 flex items-center justify-between shadow-inner animate-fade-in">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">Replying to</p>
            <p className="text-sm truncate">{replyingTo.content}</p>
          </div>
          <button 
            onClick={() => setReplyingTo(null)} 
            className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-full transition-all active:scale-95"
          >
            ×
          </button>
        </div>
      )}

      {/* Input - Premium glass effect */}
      <div className="border-t border-border/50 p-4 pb-safe bg-card/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2">
          <button className="p-2.5 text-primary hover:bg-primary/10 rounded-full transition-all duration-200 active:scale-95">
            <Paperclip className="w-5 h-5" />
          </button>
          <button className="p-2.5 text-primary hover:bg-primary/10 rounded-full transition-all duration-200 active:scale-95">
            <Image className="w-5 h-5" />
          </button>
          <Input
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-muted/60 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-xl py-2.5 text-[15px] shadow-inner transition-all"
          />
          {inputText.trim() ? (
            <button 
              onClick={handleSend} 
              disabled={sending}
              className="p-2.5 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 disabled:opacity-50 active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button className="p-2.5 text-primary hover:bg-primary/10 rounded-full transition-all duration-200 active:scale-95">
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
