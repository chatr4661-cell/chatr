import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Video, MoreVertical, Send, Paperclip, Mic, Search, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageReactionPicker } from '../chat/MessageReactionPicker';
import { MessageReactions } from '../MessageReactions';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ChatScreenProps {
  chatId: string;
  chatName: string;
  userId: string;
}

export function ChatScreen({ chatId, chatName, userId }: ChatScreenProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [forwardMessage, setForwardMessage] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [chatId]);

  const loadMessages = async () => {
    // Mock messages for demo
    const mockMessages = [
      {
        id: '1',
        content: 'Hey! How are you?',
        sender_id: 'other',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        reactions: { '❤️': [userId], '👍': ['other'] },
        is_pinned: true,
      },
      {
        id: '2',
        content: 'I\'m doing great! Just finished that project.',
        sender_id: userId,
        created_at: new Date(Date.now() - 3000000).toISOString(),
        reactions: {},
      },
      {
        id: '3',
        content: 'That\'s awesome! Want to celebrate?',
        sender_id: 'other',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        reactions: { '🔥': [userId, 'other'] },
      },
    ];
    setMessages(mockMessages);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    const newMessage = {
      id: Date.now().toString(),
      content: inputText,
      sender_id: userId,
      created_at: new Date().toISOString(),
      reactions: {},
      reply_to: replyingTo?.id,
    };
    
    setMessages([...messages, newMessage]);
    setInputText('');
    setReplyingTo(null);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions };
        if (reactions[emoji]?.includes(userId)) {
          reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...(reactions[emoji] || []), userId];
        }
        return { ...msg, reactions };
      }
      return msg;
    }));
  };

  const handlePin = (messageId: string) => {
    setMessages(messages.map(msg => 
      msg.id === messageId ? { ...msg, is_pinned: !msg.is_pinned } : msg
    ));
  };

  const pinnedMessages = messages.filter(m => m.is_pinned);
  const filteredMessages = searchQuery 
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary-glow to-primary text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/chat')} className="p-1">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                👤
              </div>
              <div>
                <h2 className="font-semibold">{chatName}</h2>
                <p className="text-xs opacity-90">Online</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-white/10">
              <Video className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-white/10">
              <Phone className="w-5 h-5" />
            </button>
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-full hover:bg-white/10">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="mt-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.map((message) => (
          <div key={message.id} className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] ${message.sender_id === userId ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'} rounded-2xl px-4 py-2 shadow-sm`}>
              {message.reply_to && (
                <div className="text-xs opacity-70 mb-1 pb-1 border-b border-current/20">
                  Replying to message
                </div>
              )}
              <p className="text-sm">{message.content}</p>
              <div className="flex items-center justify-between mt-1 gap-2">
                <span className="text-xs opacity-70">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
                <div className="flex items-center gap-1">
                  {message.is_pinned && <Pin className="w-3 h-3" />}
                  <MessageReactionPicker 
                    onReact={(emoji) => handleReaction(message.id, emoji)}
                    existingReactions={message.reactions}
                    userId={userId}
                  />
                </div>
              </div>
              {Object.keys(message.reactions).length > 0 && (
                <div className="mt-2">
                  <MessageReactions
                    reactions={Object.entries(message.reactions).map(([emoji, users]: [string, any]) => ({
                      emoji,
                      count: users.length,
                      userReacted: users.includes(userId),
                    }))}
                    onReact={(emoji) => handleReaction(message.id, emoji)}
                  />
                </div>
              )}
              <div className="flex gap-2 mt-2 text-xs">
                <button onClick={() => setReplyingTo(message)} className="opacity-70 hover:opacity-100">Reply</button>
                <button onClick={() => setForwardMessage(message)} className="opacity-70 hover:opacity-100">Forward</button>
                <button onClick={() => handlePin(message.id)} className="opacity-70 hover:opacity-100">
                  {message.is_pinned ? 'Unpin' : 'Pin'}
                </button>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="bg-secondary/50 px-4 py-2 border-t border-border flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Replying to</p>
            <p className="text-sm truncate">{replyingTo.content}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-muted-foreground">×</button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4 bg-white">
        <div className="flex items-center gap-2">
          <button className="p-2 text-primary">
            <Paperclip className="w-5 h-5" />
          </button>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1"
          />
          {inputText.trim() ? (
            <button onClick={handleSend} className="p-2 bg-primary text-primary-foreground rounded-full">
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button className="p-2 text-primary">
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
