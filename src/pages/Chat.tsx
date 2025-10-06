import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import ServiceCard from '@/components/ServiceCard';
import BusinessPortal from '@/components/BusinessPortal';
import { 
  MessageCircle, Send, LogOut, Search, MoreVertical, Phone, Video, ArrowLeft, 
  Check, CheckCheck, Image as ImageIcon, Mic, MapPin, File, Smile, BarChart3,
  Reply, Forward, Star, Copy, Trash2, Edit2, Download, X, Paperclip, User,
  Bot, Stethoscope, AlertTriangle, Activity, Trophy, ShoppingBag, Heart, Users as UsersIcon, 
  UserPlus, QrCode, Bug, Info, WifiOff, Clock, CheckSquare, Camera, Shield, Sparkles
} from 'lucide-react';
import MessageContextMenu from '@/components/MessageContextMenu';
import { PollCreator } from '@/components/PollCreator';
import { PollMessage } from '@/components/PollMessage';
import { MessageReactions } from '@/components/MessageReactions';
import { TypingIndicator, setTypingStatus } from '@/components/TypingIndicator';
import { VoiceMessageRecorder } from '@/components/VoiceMessageRecorder';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { SmartCompose } from '@/components/SmartCompose';
import { AutoTranslatedMessage } from '@/components/AutoTranslatedMessage';
import { ChatSummarizer } from '@/components/ChatSummarizer';
import { GroupChatCreator } from '@/components/GroupChatCreator';
import { MessageForwarding } from '@/components/MessageForwarding';
import { ContactManager } from '@/components/ContactManager';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { UserInfoSidebar } from '@/components/UserInfoSidebar';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import VoiceCall from '@/components/VoiceCall';
import VideoCall from '@/components/VideoCall';
import { CallInterface } from '@/components/CallInterface';
import { QRScanner } from '@/components/QRScanner';
import { DeviceSessions } from '@/components/DeviceSessions';
import { MessageReminder } from '@/components/MessageReminder';
import { TaskFromMessage } from '@/components/TaskFromMessage';
import { CollaborativeNotes } from '@/components/CollaborativeNotes';
import { AIDocumentSearch } from '@/components/AIDocumentSearch';
import { OfflineChat } from '@/components/OfflineChat';
import { ImprovedCallNotifications } from '@/components/ImprovedCallNotifications';
import { EmojiPicker } from '@/components/EmojiPicker';
import GlobalSearch from '@/components/GlobalSearch';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { AISmartReplyPanel } from '@/components/AISmartReplyPanel';
import { AIChatToolbar } from '@/components/AIChatToolbar';
import { MessageSearchBar } from '@/components/MessageSearchBar';
import { pickImage, getCurrentLocation, startVoiceRecording, stopVoiceRecording } from '@/utils/mediaUtils';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { Camera as CapCamera } from '@capacitor/camera';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import logo from '@/assets/chatr-logo.png';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
  last_seen?: string;
  is_online?: boolean;
  preferred_language?: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
  message_type: string;
  media_url?: string;
  file_name?: string;
  duration?: number;
  reply_to_id?: string;
  reply_message?: {
    id: string;
    content: string;
    reply_sender?: {
      username: string;
    };
  };
  is_edited?: boolean;
  is_deleted?: boolean;
  is_starred?: boolean;
  location_latitude?: number;
  location_longitude?: number;
  location_name?: string;
  poll_question?: string;
  poll_options?: any;
  sender?: Profile;
  status?: 'sent' | 'delivered' | 'read';
  reactions?: Array<{ userId: string; emoji: string }>;
  scheduled_for?: string;
}

const Chat = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showMediaActions, setShowMediaActions] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [showMessageForwarding, setShowMessageForwarding] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'consumer' | 'business' | 'contacts' | 'offline'>('consumer');
  const [isProvider, setIsProvider] = useState(false);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [showOfflineMode, setShowOfflineMode] = useState(false);
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video', callId: string, partnerId: string } | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showDeviceSessions, setShowDeviceSessions] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<Message | null>(null);
  const [taskMessage, setTaskMessage] = useState<Message | null>(null);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showUserInfoSidebar, setShowUserInfoSidebar] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Enable real-time notifications
  useRealtimeNotifications(user?.id);
  
  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Scroll to specific message (for search)
  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      messageElement.classList.add('bg-primary/20', 'transition-colors', 'duration-300');
      setTimeout(() => {
        messageElement.classList.remove('bg-primary/20');
      }, 2000);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Keep user online with periodic heartbeat
  useEffect(() => {
    if (!user?.id) return;
    
    const updateOnlineStatus = async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('id', user.id);
      
      if (error) {
        console.error('❌ Error updating online status:', error);
      }
    };
    
    // Update immediately and then every 30 seconds
    updateOnlineStatus();
    const interval = setInterval(updateOnlineStatus, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
        checkProviderStatus(session.user.id);
        
        // Set user online status
        supabase
          .from('profiles')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', session.user.id)
          .then(() => console.log('✅ User set to online'));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
        checkProviderStatus(session.user.id);
      }
    });

    // Set user offline when page unloads - FIXED: Use proper API endpoint
    const handleBeforeUnload = async () => {
      if (user?.id) {
        // Use fetch with keepalive for beacon-like behavior
        await fetch(`https://sbayuqgomlflmxgicplz.supabase.co/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ 
            is_online: false, 
            last_seen: new Date().toISOString() 
          }),
          keepalive: true
        }).catch(err => console.error('Error setting offline:', err));
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set offline when component unmounts
      if (user?.id) {
        supabase
          .from('profiles')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) {
              console.error('❌ Error setting offline:', error);
            } else {
              console.log('✅ User set to offline');
            }
          });
      }
    };
  }, [navigate]);

  const checkProviderStatus = async (userId: string) => {
    const { data } = await supabase
      .from('service_providers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setIsProvider(true);
      setViewMode('business');
    }
  };

  const loadProfile = async (userId: string) => {
    console.log('🔍 Loading profile for user ID:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error loading profile:', error);
      console.error('❌ User ID that failed:', userId);
      toast({
        title: 'Authentication Error',
        description: 'Your session is invalid. Please log out and log back in.',
        variant: 'destructive',
        duration: 10000
      });
      return;
    }

    if (!data) {
      console.error('❌ No profile found for user ID:', userId);
      toast({
        title: 'Profile Not Found',
        description: 'Please log out and log back in to fix your session.',
        variant: 'destructive',
        duration: 10000
      });
      return;
    }

    console.log('✅ Profile loaded:', data.username, '(', data.id, ')');
    setProfile(data);
    loadContacts();
  };

  const loadContacts = async () => {
    if (!user?.id) {
      console.log('⚠️ Cannot load contacts: user not authenticated');
      return;
    }

    console.log('📇 Loading contacts for user:', user.id);

    // Get user's contacts with profile info
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_registered', true);

    if (contactsError) {
      console.error('❌ Error loading contacts:', contactsError);
      return;
    }

    if (contactsData && contactsData.length > 0) {
      const contactUserIds = contactsData
        .filter(c => c.contact_user_id)
        .map(c => c.contact_user_id);

      if (contactUserIds.length > 0) {
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('*')
          .in('id', contactUserIds);

        if (error) {
          console.error('❌ Error loading contact profiles:', error);
          return;
        }

        console.log(`✅ Loaded ${profilesData?.length || 0} contact profiles`);
        console.log('👥 Contact online statuses:', profilesData?.map(p => ({ 
          username: p.username, 
          is_online: p.is_online,
          last_seen: p.last_seen 
        })));
        setContacts(profilesData || []);
      } else {
        console.log('ℹ️ No contact user IDs found');
        setContacts([]);
      }
    } else {
      console.log('ℹ️ No registered contacts found');
      setContacts([]);
    }
  };

  // Subscribe to profile updates for real-time online status - FIXED
  useEffect(() => {
    if (!user?.id || contacts.length === 0) return;
    
    console.log('📡 Setting up profile realtime subscription for contacts');
    const contactIds = contacts.map(c => c.id);
    
    const channel = supabase
      .channel('profile-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: `id=in.(${contactIds.join(',')})`
      }, (payload) => {
        console.log('👤 Contact profile updated:', payload.new);
        setContacts(prev => prev.map(c => 
          c.id === payload.new.id ? { ...c, ...payload.new as any } : c
        ));
      })
      .subscribe();
      
    return () => {
      console.log('🔌 Unsubscribing from profile updates');
      supabase.removeChannel(channel);
    };
  }, [user?.id, contacts.map(c => c.id).join(',')]);

  // Reload contacts when switching back to consumer view
  useEffect(() => {
    if (viewMode === 'consumer' && user?.id) {
      loadContacts();
    }
  }, [viewMode, user?.id]);

  const selectContact = async (contact: Profile) => {
    if (!user?.id) {
      toast({
        title: 'Authentication Required',
        description: 'Please wait for authentication to complete',
        variant: 'destructive'
      });
      return;
    }

    console.log('🎯 Selecting contact:', contact.username, contact.id);
    setSelectedContact(contact);
    
    try {
      const conversationId = await findOrCreateConversation(user.id, contact.id);
      
      if (!conversationId) {
        toast({
          title: 'Error',
          description: 'Failed to start conversation',
          variant: 'destructive'
        });
        return;
      }
      
      console.log('✅ Using conversation:', conversationId);
      setConversationId(conversationId);
      await loadMessages(conversationId);
      
    } catch (error) {
      console.error('❌ Error in selectContact:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive'
      });
    }
  };
  
  const findOrCreateConversation = async (userId1: string, userId2: string): Promise<string | null> => {
    console.log('🔍 Finding conversation between:', userId1, 'and', userId2);
    
    // Use the database function to find shared conversation
    const { data, error } = await supabase
      .rpc('find_shared_conversation', {
        user1_id: userId1,
        user2_id: userId2
      });
    
    if (error) {
      console.error('❌ Error calling find_shared_conversation:', error);
      return await createConversation(userId1, userId2);
    }
    
    if (data) {
      console.log('✅ Found existing conversation:', data);
      return data;
    }
    
    console.log('📝 No shared conversation found, creating new');
    return await createConversation(userId1, userId2);
  };
  
  const createConversation = async (userId1: string, userId2: string): Promise<string | null> => {
    console.log('➕ Creating conversation between:', userId1, 'and', userId2);
    
    // Create the conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({ created_by: userId1, is_group: false })
      .select('id')
      .single();
    
    if (convError || !newConv) {
      console.error('❌ Failed to create conversation:', convError);
      return null;
    }
    
    console.log('✅ Created conversation:', newConv.id);
    
    // Add both participants
    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConv.id, user_id: userId1 },
        { conversation_id: newConv.id, user_id: userId2 }
      ]);
    
    if (participantError) {
      console.error('❌ Failed to add participants:', participantError);
      return null;
    }
    
    console.log('✅ Added participants to conversation');
    return newConv.id;
  };

  const loadMessages = async (convId: string) => {
    if (!convId) {
      console.log('⚠️ Cannot load messages: no conversation ID');
      setMessages([]);
      return;
    }
    
    console.log('📥 Loading messages for conversation:', convId);
    
    try {
      // First check participation
      const { data: participation } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', convId)
        .eq('user_id', user?.id)
        .maybeSingle();
        
      if (!participation) {
        console.warn('⚠️ User not participant in conversation:', convId);
      }
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            avatar_url,
            status
          )
        `)
        .eq('conversation_id', convId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading messages:', error);
        toast({
          title: 'Error loading messages',
          description: error.message,
          variant: 'destructive'
        });
        setMessages([]);
        return;
      }

      console.log(`✅ LOADED ${data?.length || 0} messages for ${convId}`);
      
      // Map messages with proper typing
      const mappedMessages = (data || []).map(msg => ({
        ...msg,
        status: msg.status as 'sent' | 'delivered' | 'read',
      }));
      
      setMessages(mappedMessages as any);
      console.log('✅ STATE SET with', mappedMessages.length, 'messages');
    
      // Mark received messages as delivered
      if (data && data.length > 0) {
        const receivedUndelivered = data.filter(
          msg => msg.sender_id !== user?.id && msg.status === 'sent'
        );
        if (receivedUndelivered.length > 0) {
          await supabase
            .from('messages')
            .update({ status: 'delivered' })
            .in('id', receivedUndelivered.map(m => m.id));
        }
        
        // Mark visible messages as read
        const unreadMessages = data.filter(
          msg => msg.sender_id !== user?.id && !msg.read_at
        );
        if (unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ 
              read_at: new Date().toISOString(),
              status: 'read'
            })
            .in('id', unreadMessages.map(m => m.id));
        }
      }
    } catch (err) {
      console.error('❌ Unexpected error in loadMessages:', err);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      });
      setMessages([]);
    }
  };

  // Separate useEffect to manage message subscription
  useEffect(() => {
    if (!conversationId) return;

    console.log('📡 Setting up realtime subscription for conversation:', conversationId);
    
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('🔔 NEW MESSAGE RECEIVED via realtime:', payload);
          
          const { data: newMessage, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('❌ Error fetching message details:', error);
            return;
          }

          if (newMessage) {
            console.log('✅ Adding message to state:', newMessage);
            console.log('📊 Current messages array before add:', messages);
            // Only add if message belongs to current conversation
            setMessages((prev) => {
              console.log('📊 Previous messages in setState:', prev);
              // Prevent duplicates
              if (prev.some(m => m.id === newMessage.id)) {
                console.log('⚠️ Message already exists, skipping');
                return prev;
              }
              const updated = [...prev, newMessage as any];
              console.log('📊 Updated messages array:', updated);
              return updated;
            });
            
            // Mark as read if from someone else
            if (newMessage.sender_id !== user?.id) {
              await supabase
                .from('messages')
                .update({ 
                  read_at: new Date().toISOString(),
                  status: 'read'
                })
                .eq('id', newMessage.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Update message status and reactions in realtime
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? { ...msg, ...payload.new as any } : msg
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('📡 Message subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to messages for conversation:', conversationId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to messages channel');
        }
      });

    return () => {
      console.log('🔌 Unsubscribing from messages:', conversationId);
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    
    // Only set typing status if we have valid IDs
    if (conversationId && user?.id && conversationId.trim() !== '' && user.id.trim() !== '') {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      setTypingStatus(conversationId, user.id, true);
      
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(conversationId, user.id, false);
      }, 2000);
    }
  };

  const sendMessage = async (e: React.FormEvent, messageType: string = 'text', additionalData: any = {}) => {
    e.preventDefault();
    
    console.log('📤 Sending message:', { messageType, conversationId, userId: user?.id, messageInput });
    
    if ((!messageInput.trim() && messageType === 'text') || !conversationId || !user) {
      console.error('❌ Cannot send - missing data:', { hasInput: !!messageInput.trim(), conversationId, userId: user?.id });
      return;
    }

    const messageData: any = {
      sender_id: user.id,
      conversation_id: conversationId,
      message_type: messageType,
      reply_to_id: replyToMessage?.id || null,
      ...additionalData
    };

    if (messageType === 'text') {
      messageData.content = messageInput;
    }

    console.log('📝 Message data:', messageData);

    const { error, data } = await supabase.from('messages').insert(messageData).select();

    if (error) {
      console.error('❌ Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message: ' + error.message,
        variant: 'destructive',
      });
      return;
    }

    console.log('✅ Message sent successfully:', data);
    setMessageInput('');
    setReplyToMessage(null);
    if (conversationId && user) {
      setTypingStatus(conversationId, user.id, false);
    }
  };

  const handleVoiceTranscription = async (text: string, audioUrl?: string) => {
    if (!conversationId) return;
    
    await sendMessage(new Event('submit') as any, 'voice', {
      content: text,
      media_url: audioUrl || ''
    });
    
    setShowVoiceRecorder(false);
  };

  const handleImagePick = async () => {
    const imageUrl = await pickImage();
    if (imageUrl) {
      sendMessage(new Event('submit') as any, 'image', { media_url: imageUrl, content: 'Photo' });
    }
    setShowMediaActions(false);
  };

  const handleLocationShare = async () => {
    const location = await getCurrentLocation();
    if (location) {
      sendMessage(new Event('submit') as any, 'location', {
        content: 'Location',
        location_latitude: location.latitude,
        location_longitude: location.longitude,
        location_name: 'Current Location'
      });
    }
    setShowMediaActions(false);
  };

  const handleVoiceRecord = async () => {
    if (!isRecording) {
      setIsRecording(true);
      startVoiceRecording();
      toast({
        title: 'Recording...',
        description: 'Tap to stop recording'
      });
    } else {
      stopVoiceRecording();
      setIsRecording(false);
      toast({
        title: 'Voice message sent!',
      });
    }
  };

  const handlePollSend = (question: string, options: string[]) => {
    const pollOptions = options.map(text => ({ text, votes: 0 }));
    sendMessage(new Event('submit') as any, 'poll', {
      content: question,
      poll_question: question,
      poll_options: pollOptions
    });
  };

  const handleReact = async (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex(r => r.userId === user.id && r.emoji === emoji);
    
    let newReactions;
    if (existingIndex >= 0) {
      newReactions = reactions.filter((_, i) => i !== existingIndex);
    } else {
      newReactions = [...reactions, { userId: user.id, emoji }];
    }

    const { error } = await supabase
      .from('messages')
      .update({ reactions: newReactions })
      .eq('id', messageId);

    if (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleStarMessage = async (messageId: string, isStarred: boolean) => {
    await supabase
      .from('messages')
      .update({ is_starred: !isStarred })
      .eq('id', messageId);
  };

  const handleDeleteMessage = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const handleVoiceMessageSend = async (audioBlob: Blob, duration: number) => {
    if (!conversationId || !user) return;

    try {
      // Upload audio to storage
      const fileName = `voice-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('social-media')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(fileName);

      // Send message
      await sendMessage(new Event('submit') as any, 'voice', {
        content: 'Voice message',
        media_url: publicUrl,
        duration: duration
      });

      setShowVoiceRecorder(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send voice message',
        variant: 'destructive'
      });
    }
  };

  const handleForwardMessage = (message: Message) => {
    setMessageToForward(message);
    setShowMessageForwarding(true);
  };

  const startVoiceCall = async () => {
    if (!selectedContact || !conversationId || !user || !profile) return;

    console.log('📞 Starting voice call with:', {
      receiver: selectedContact,
      caller: profile
    });

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        conversation_id: conversationId,
        caller_id: user.id,
        caller_name: profile.username,
        receiver_id: selectedContact.id,
        receiver_name: selectedContact.username,
        call_type: 'voice',
        status: 'ringing'
      })
      .select()
      .single();

    console.log('📞 Voice call created:', call, 'Error:', error);

    if (error || !call) {
      toast({
        title: 'Error',
        description: 'Failed to start call',
        variant: 'destructive'
      });
      return;
    }

    setActiveCall({
      type: 'voice',
      callId: call.id,
      partnerId: selectedContact.id
    });
  };

  const startVideoCall = async () => {
    if (!selectedContact || !conversationId || !user || !profile) return;

    console.log('📹 Starting video call with:', {
      receiver: selectedContact,
      caller: profile
    });

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        conversation_id: conversationId,
        caller_id: user.id,
        caller_name: profile.username,
        receiver_id: selectedContact.id,
        receiver_name: selectedContact.username,
        call_type: 'video',
        status: 'ringing'
      })
      .select()
      .single();

    console.log('📹 Video call created:', call, 'Error:', error);

    if (error || !call) {
      toast({
        title: 'Error',
        description: 'Failed to start call',
        variant: 'destructive'
      });
      return;
    }

    setActiveCall({
      type: 'video',
      callId: call.id,
      partnerId: selectedContact.id
    });
  };

  const endCall = async () => {
    if (!activeCall) return;

    await supabase
      .from('calls')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', activeCall.callId);

    setActiveCall(null);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (viewMode === 'business' && isProvider && !selectedContact) {
    return (
      <div className="h-screen flex bg-background relative">
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('consumer')}
            className="rounded-full shadow-lg"
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            Switch to Consumer
          </Button>
        </div>
        <BusinessPortal />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Main Container - WhatsApp/Telegram Style */}
      <div className="flex w-full max-w-full mx-auto">
        {/* Sidebar - Contact List */}
        <div className={`${selectedContact || viewMode === 'offline' ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-border/30 glass-card`}>
          {/* Header - Glass UI Enhanced */}
          <div className="p-3 border-b border-border/30 glass backdrop-blur-xl shadow-glass">
            <div className="flex items-center gap-3 mb-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full hover:bg-primary/20 hover:shadow-glow transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={logo} alt="chatr+ Logo" className="h-8 object-contain flex-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProfileEdit(true)}
                className="rounded-full hover:bg-primary/20 hover:shadow-glow transition-all"
                title="Edit Profile"
              >
                <User className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode(viewMode === 'contacts' ? 'consumer' : 'contacts')}
                className="rounded-full hover:bg-primary/10"
                title="Contacts"
              >
                <UsersIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode(viewMode === 'offline' ? 'consumer' : 'offline')}
                className="rounded-full hover:bg-primary/10"
                title="Offline Chat Mode"
              >
                <WifiOff className="h-5 w-5" />
              </Button>
              {isProvider && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('business')}
                  className="rounded-full"
                >
                  <Stethoscope className="h-5 w-5" />
                </Button>
              )}
              <CallInterface userId={user?.id || ''} username={profile?.username || 'User'} />
              <Sheet open={showDeviceSessions} onOpenChange={setShowDeviceSessions}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" title="Linked Devices">
                    <QrCode className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Device Management</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <DeviceSessions />
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => {
                        setShowDeviceSessions(false);
                        setShowQRScanner(true);
                      }}
                    >
                      Link New Device
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
            
            {showGlobalSearch && (
              <div className="relative px-4 pb-2">
                <GlobalSearch 
                  open={showGlobalSearch}
                  onClose={() => setShowGlobalSearch(false)}
                />
              </div>
            )}

            {/* Announcements Banner */}
            <div className="px-3">
              <AnnouncementBanner />
            </div>
          </div>

          {/* Contacts List, Contact Manager, or Offline Chat */}
          {viewMode === 'offline' ? (
            <div className="flex-1">
              {/* Offline mode will be rendered in main area */}
            </div>
          ) : viewMode === 'contacts' ? (
            <ContactManager 
              userId={user?.id || ''} 
              onContactSelect={(contact) => {
                setViewMode('consumer');
                selectContact(contact);
              }}
            />
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-1">
                {contacts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No contacts yet</p>
                    <p className="text-sm mt-2">Click the contacts icon to add people</p>
                    <Button 
                      onClick={() => setViewMode('contacts')}
                      className="mt-4"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Contacts
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {contacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => selectContact(contact)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedContact(contact);
                          setShowUserProfile(true);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 glass-card hover:shadow-card active:scale-[0.98] transition-all duration-200 rounded-xl mb-2 ${
                          selectedContact?.id === contact.id ? 'ring-2 ring-primary/30 shadow-glow' : ''
                        }`}
                        title="Long press to view profile"
                      >
                         <div className="relative flex-shrink-0">
                          <Avatar className="h-14 w-14 ring-2 ring-primary/20 shadow-md transition-all hover:ring-primary/40 hover:shadow-glow">
                            {contact.avatar_url ? (
                              <img src={contact.avatar_url} alt={contact.username} className="object-cover" />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground font-semibold text-lg">
                                {contact.username[0].toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          {contact.is_online && (
                            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-[2.5px] border-background shadow-glow animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-baseline justify-between mb-0.5">
                            <p className="font-semibold text-[17px] text-foreground truncate">{contact.username}</p>
                            <span className="text-[15px] text-muted-foreground flex-shrink-0 ml-2">
                              {contact.is_online ? 'now' : formatTime(contact.last_seen || '')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <p className="text-[15px] text-muted-foreground truncate leading-tight">
                              {contact.status || 'Hey there! I am using Chatr'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat Area - Glass UI */}
        <div className={`${selectedContact || viewMode === 'offline' ? 'flex' : 'hidden md:flex'} flex-1 flex-col glass-card border-l border-border/30`}>
          {viewMode === 'offline' ? (
            <OfflineChat />
          ) : selectedContact ? (
            <>
              {/* Chat Header - Glass UI */}
              <div className="px-4 py-3 border-b border-border/30 glass backdrop-blur-xl flex items-center justify-between shadow-glass">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden rounded-full flex-shrink-0 h-8 w-8 hover:bg-primary/10"
                    onClick={() => setSelectedContact(null)}
                  >
                    <ArrowLeft className="h-5 w-5 text-primary" />
                  </Button>
                  <div 
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:opacity-70 transition-all hover:scale-105 duration-200"
                    onClick={() => setShowUserProfile(true)}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11 ring-2 ring-primary/20 shadow-md hover:shadow-glow transition-all">
                        {selectedContact.avatar_url ? (
                          <img src={selectedContact.avatar_url} alt={selectedContact.username} className="object-cover" />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground font-semibold text-sm">
                            {selectedContact.username[0].toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {selectedContact.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-glow animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[17px] text-foreground truncate">{selectedContact.username}</h3>
                      <p className="text-[13px] text-muted-foreground truncate">
                        {selectedContact.is_online ? 'Active now' : `Active ${formatTime(selectedContact.last_seen || '')}`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {/* Message Search */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-8 w-8"
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                  >
                    <Search className={`h-5 w-5 ${showMessageSearch ? 'text-primary' : 'text-muted-foreground'}`} />
                  </Button>
                  
                  {/* AI Search */}
                  {conversationId && <AIDocumentSearch conversationId={conversationId} />}
                  
                  {/* Collaborative Notes */}
                  {conversationId && <CollaborativeNotes conversationId={conversationId} />}
                  
                  {/* AI Summary Button */}
                  <ChatSummarizer messages={messages} />
                  
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={startVideoCall}>
                    <Video className="h-5 w-5 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={startVoiceCall}>
                    <Phone className="h-5 w-5 text-primary" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-8 w-8"
                    onClick={() => setShowUserInfoSidebar(true)}
                  >
                    <Info className="h-5 w-5 text-primary" />
                  </Button>
                </div>
              </div>
              
              {/* Message Search Bar */}
              {showMessageSearch && (
                <MessageSearchBar
                  messages={messages}
                  onResultSelect={scrollToMessage}
                  onClose={() => setShowMessageSearch(false)}
                />
              )}

              {/* Messages Area - Glass UI Chat */}
              <ScrollArea className="flex-1 p-3 glass backdrop-blur-md">
                <div className="space-y-1 max-w-4xl mx-auto">
                  {(() => {
                    console.log('🎨 RENDER - Messages:', messages.length, 'Conversation:', conversationId);
                    return null;
                  })()}
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.sender_id === user?.id;
                      
                      return (
                        <ContextMenu key={message.id}>
                          <ContextMenuTrigger>
                            <div 
                              ref={(el) => el && messageRefs.current.set(message.id, el)}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 group animate-fade-in`}
                            >
                              {!isOwn && (
                                <div 
                                  className="flex flex-col items-center mr-2 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    setSelectedContact(message.sender as Profile);
                                    setShowUserProfile(true);
                                  }}
                                >
                                  <Avatar className="h-9 w-9 ring-2 ring-border/10 hover:ring-primary/30 transition-all shadow-sm">
                                    {message.sender?.avatar_url ? (
                                      <img src={message.sender.avatar_url} alt={message.sender.username} className="object-cover" />
                                    ) : (
                                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground text-xs font-semibold">
                                        {message.sender?.username?.[0]?.toUpperCase() || 'U'}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <span className="text-[9px] text-muted-foreground/80 font-medium mt-0.5 max-w-[60px] truncate text-center hover:text-primary transition-colors">
                                    {message.sender?.username || 'User'}
                                  </span>
                                </div>
                              )}
                              <div className={`max-w-[85%] md:max-w-[70%] relative`}>
                              {message.message_type === 'poll' && message.poll_options ? (
                                <PollMessage
                                  question={message.poll_question || ''}
                                  options={message.poll_options}
                                  totalVotes={0}
                                  onVote={(index) => {}}
                                />
                              ) : message.message_type === 'image' ? (
                                <div className={`rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                                  <img src={message.media_url} alt="Shared image" className="max-w-full" />
                                  <div className="px-3 py-1.5 bg-gradient-to-t from-black/60 to-transparent text-white text-xs flex items-center justify-end gap-1.5">
                                    <span className="font-medium">{formatTime(message.created_at)}</span>
                                    {isOwn && (
                                      message.status === 'read' || message.read_at ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                                      ) : message.status === 'delivered' ? (
                                        <CheckCheck className="h-3.5 w-3.5" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5" />
                                      )
                                    )}
                                  </div>
                                </div>
                              ) : message.message_type === 'location' ? (
                                <div className={`rounded-2xl p-3.5 shadow-lg hover:shadow-xl transition-all ${
                                  isOwn 
                                    ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md' 
                                    : 'bg-card text-card-foreground rounded-bl-md border border-border/30'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span className="font-medium">{message.location_name}</span>
                                  </div>
                                </div>
                              ) : (
                                 <div className={`rounded-2xl px-4 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200 ${
                                  isOwn
                                    ? 'bg-gradient-to-br from-primary via-primary to-primary/95 text-primary-foreground rounded-br-md'
                                    : 'bg-card text-card-foreground rounded-bl-md border border-border/20 backdrop-blur-sm'
                                }`}>
                                  {/* Reply Preview in Message */}
                                  {message.reply_to_id && (
                                    <div className={`mb-2 pl-3 border-l-2 rounded-r-lg p-2 ${
                                      isOwn 
                                        ? 'border-white/30 bg-white/10 backdrop-blur-sm' 
                                        : 'border-primary/40 bg-muted/20'
                                    }`}>
                                      <p className={`text-xs font-semibold ${isOwn ? 'text-white/90' : 'text-primary'}`}>
                                        Replying to message
                                      </p>
                                      <p className={`text-xs truncate mt-0.5 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                                        Tap to view original
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Voice Message Audio Player */}
                                  {message.message_type === 'voice' && message.media_url && (
                                    <div className="mb-2">
                                      <audio controls className="w-full max-w-xs rounded-lg">
                                        <source src={message.media_url} type="audio/webm" />
                                        Your browser does not support audio playback.
                                      </audio>
                                    </div>
                                  )}
                                  
                                  {/* Message Content with Auto Translation */}
                                  {!isOwn ? (
                                    <AutoTranslatedMessage
                                      messageId={message.id}
                                      originalText={message.content}
                                      userLanguage={profile?.preferred_language || 'en'}
                                      className="text-[15px] leading-relaxed break-words whitespace-pre-wrap"
                                    />
                                  ) : (
                                    <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
                                  )}
                                  <div className="flex items-center gap-1.5 justify-end mt-1.5">
                                    {message.is_edited && (
                                      <span className={`text-[10px] italic ${isOwn ? 'text-white/70' : 'text-muted-foreground/70'}`}>edited</span>
                                    )}
                                    <span className={`text-[10px] ${isOwn ? 'text-white/80' : 'text-muted-foreground/80'}`}>
                                      {formatTime(message.created_at)}
                                    </span>
                                    {isOwn && (
                                      message.status === 'read' || message.read_at ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-white/90" />
                                      ) : message.status === 'delivered' ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-white/70" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 text-white/70" />
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Message Reactions - Below message bubble */}
                              {message.reactions && message.reactions.length > 0 && (
                                <div className={`absolute -bottom-2.5 ${isOwn ? 'right-2' : 'left-2'} animate-scale-in`}>
                                  <MessageReactions
                                    reactions={message.reactions.reduce((acc, r) => {
                                      const existing = acc.find(item => item.emoji === r.emoji);
                                      if (existing) {
                                        existing.count++;
                                        if (r.userId === user?.id) existing.userReacted = true;
                                      } else {
                                        acc.push({ emoji: r.emoji, count: 1, userReacted: r.userId === user?.id });
                                      }
                                      return acc;
                                    }, [] as Array<{ emoji: string; count: number; userReacted: boolean }>)}
                                    onReact={(emoji) => handleReact(message.id, emoji)}
                                  />
                                </div>
                              )}
                              </div>
                            </div>
                          </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => handleReact(message.id, '👍')}>
                            <Smile className="h-4 w-4 mr-2" />
                            React
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => setReplyToMessage(message)}>
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleForwardMessage(message)}>
                            <Forward className="h-4 w-4 mr-2" />
                            Forward
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleStarMessage(message.id, message.is_starred || false)}>
                            <Star className="h-4 w-4 mr-2" />
                            {message.is_starred ? 'Unstar' : 'Star'}
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            navigator.clipboard.writeText(message.content);
                            toast({ title: 'Copied to clipboard' });
                          }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => setReminderMessage(message)}>
                            <Clock className="h-4 w-4 mr-2" />
                            Remind Me Later
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => setTaskMessage(message)}>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Create Task
                          </ContextMenuItem>
                          {isOwn && (
                            <ContextMenuItem onClick={() => handleDeleteMessage(message.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                          </ContextMenu>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                {conversationId && user?.id && <TypingIndicator conversationId={conversationId} currentUserId={user.id} />}
              </ScrollArea>

              {/* Reply Preview */}
              {replyToMessage && (
                <div className="px-4 py-2 bg-muted/50 border-t border-border flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Replying to {replyToMessage.sender?.username}</p>
                    <p className="text-sm truncate">{replyToMessage.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setReplyToMessage(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* AI Suggestions Panel */}
              {messages.length > 0 && !showVoiceRecorder && (
                <div className="px-3 pb-2">
                  <AISmartReplyPanel
                    lastMessage={messages[messages.length - 1]?.content || ''}
                    onSelectReply={(reply) => setMessageInput(reply)}
                  />
                </div>
              )}

              {/* Input Area - Glass UI */}
              <div className="p-3 border-t border-border/30 glass backdrop-blur-xl">
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <Sheet open={showMediaActions} onOpenChange={setShowMediaActions}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-auto">
                      <SheetHeader>
                        <SheetTitle>Send</SheetTitle>
                      </SheetHeader>
                      <div className="grid grid-cols-4 gap-4 py-4">
                        {/* Media Action Button Component */}
                        {(() => {
                          const MessageAction = ({ icon: Icon, label, onClick, color }: { 
                            icon: React.ComponentType<any>; 
                            label: string; 
                            onClick: () => void; 
                            color: string 
                          }) => (
                            <button
                              type="button"
                              onClick={onClick}
                              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
                            >
                              <Icon className={`h-6 w-6 ${color}`} />
                              <span className="text-xs">{label}</span>
                            </button>
                          );
                          
                          return (
                            <>
                              <MessageAction icon={Camera} label="Camera" onClick={async () => {
                          try {
                            const photo = await CapCamera.getPhoto({
                              quality: 90,
                              allowEditing: false,
                              resultType: 'base64' as any
                            });
                            if (photo.base64String) {
                              const imageUrl = `data:image/${photo.format};base64,${photo.base64String}`;
                              sendMessage(new Event('submit') as any, 'image', { media_url: imageUrl, content: 'Photo' });
                            }
                            setShowMediaActions(false);
                          } catch (error) {
                            console.error('Camera error:', error);
                          }
                        }} color="text-pink-500" />
                              <MessageAction icon={ImageIcon} label="Gallery" onClick={handleImagePick} color="text-blue-500" />
                              <MessageAction icon={File} label="Document" onClick={() => {}} color="text-purple-500" />
                              <MessageAction icon={MapPin} label="Location" onClick={handleLocationShare} color="text-green-500" />
                              <MessageAction icon={BarChart3} label="Poll" onClick={() => { setShowMediaActions(false); setShowPollCreator(true); }} color="text-orange-500" />
                            </>
                          );
                        })()}
                      </div>
                    </SheetContent>
                  </Sheet>

                  <div className="flex-1 relative">
                    <Input
                      value={messageInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder="Type a message"
                      className="rounded-full bg-background border-border pr-12"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <EmojiPicker 
                        onEmojiSelect={(emoji) => setMessageInput(prev => prev + emoji)}
                      />
                    </div>
                  </div>

                  {messageInput.trim() ? (
                    <Button
                      type="submit"
                      size="icon"
                      className="rounded-full flex-shrink-0 h-11 w-11"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      className="rounded-full flex-shrink-0 h-11 w-11"
                      onClick={() => setShowVoiceRecorder(true)}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </form>
              </div>
            </>
          ) : (
            // Empty State - No Chat Selected
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
              <div className="text-center max-w-2xl">
                <div className="relative inline-block mb-6">
                  <MessageCircle className="h-24 w-24 mx-auto text-primary/30" />
                  <Sparkles className="h-8 w-8 absolute -top-2 -right-2 text-primary animate-pulse" />
                </div>
                
                <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  AI-Powered Chatr
                </h2>
                
                <div className="space-y-4 text-left bg-card/50 backdrop-blur rounded-2xl p-6 border border-primary/20 mb-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">AI-Smart Messaging</p>
                      <p className="text-sm text-muted-foreground">Auto-summaries, smart replies, and reminders so you never lose track</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Privacy First</p>
                      <p className="text-sm text-muted-foreground">End-to-end encrypted</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckSquare className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Built for Life + Work</p>
                      <p className="text-sm text-muted-foreground">Turn messages into tasks, notes, or meeting reminders instantly</p>
                    </div>
                  </div>
                </div>
                
                <Button onClick={() => navigate('/')} variant="outline" size="lg" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Message Recorder */}
      {showVoiceRecorder && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-md w-full p-6">
            <VoiceRecorder
              onTranscription={handleVoiceTranscription}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </div>
        </div>
      )}

      {/* Group Chat Creator */}
      <GroupChatCreator
        open={showGroupCreator}
        onOpenChange={setShowGroupCreator}
        contacts={contacts}
        userId={user?.id || ''}
        onGroupCreated={(groupId) => {
          toast({
            title: "Success",
            description: "Group created successfully"
          });
          setShowGroupCreator(false);
        }}
      />

      {/* Message Forwarding */}
      {messageToForward && (
        <MessageForwarding
          open={showMessageForwarding}
          onOpenChange={setShowMessageForwarding}
          message={messageToForward}
          conversations={allConversations}
          userId={user?.id || ''}
        />
      )}

      <PollCreator
        open={showPollCreator}
        onClose={() => setShowPollCreator(false)}
        onSend={handlePollSend}
      />

      {/* Improved Call Notifications System */}
      {profile && (
        <ImprovedCallNotifications 
          userId={user.id} 
          username={profile.username} 
        />
      )}

      {/* QR Scanner for linking devices */}
      <QRScanner open={showQRScanner} onOpenChange={setShowQRScanner} />


      {/* User Profile Dialog */}
      <UserProfileDialog
        user={selectedContact as any}
        open={showUserProfile}
        onOpenChange={setShowUserProfile}
      />

      {/* User Info Sidebar */}
      <UserInfoSidebar
        contact={selectedContact as any}
        open={showUserInfoSidebar}
        onOpenChange={setShowUserInfoSidebar}
      />

      {/* Profile Edit Dialog */}
      {profile && (
        <ProfileEditDialog
          profile={profile as any}
          open={showProfileEdit}
          onOpenChange={setShowProfileEdit}
          onProfileUpdated={() => loadProfile(user?.id)}
        />
      )}

      {/* Message Reminder Dialog */}
      {reminderMessage && (
        <MessageReminder
          messageId={reminderMessage.id}
          messageContent={reminderMessage.content}
          open={!!reminderMessage}
          onOpenChange={(open) => !open && setReminderMessage(null)}
        />
      )}

      {/* Task from Message Dialog */}
      {taskMessage && (
        <TaskFromMessage
          messageContent={taskMessage.content}
          open={!!taskMessage}
          onOpenChange={(open) => !open && setTaskMessage(null)}
        />
      )}
    </div>
  );
};

export default Chat;
