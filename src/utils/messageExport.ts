import { supabase } from '@/integrations/supabase/client';

interface ExportMessage {
  sender: string;
  content: string;
  type: string;
  timestamp: string;
}

export const exportMessages = async (conversationId: string, format: 'json' | 'txt' | 'csv' = 'json') => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        content,
        message_type,
        created_at,
        sender:profiles!messages_sender_id_fkey(username)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const exportData: ExportMessage[] = (messages || []).map(m => ({
      sender: m.sender?.username || 'Unknown',
      content: m.content,
      type: m.message_type || 'text',
      timestamp: new Date(m.created_at).toLocaleString(),
    }));

    let fileContent: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        fileContent = JSON.stringify(exportData, null, 2);
        filename = `chat-export-${Date.now()}.json`;
        mimeType = 'application/json';
        break;

      case 'csv':
        const headers = 'Sender,Content,Type,Timestamp\n';
        const rows = exportData
          .map(m => `"${m.sender}","${m.content.replace(/"/g, '""')}","${m.type}","${m.timestamp}"`)
          .join('\n');
        fileContent = headers + rows;
        filename = `chat-export-${Date.now()}.csv`;
        mimeType = 'text/csv';
        break;

      case 'txt':
      default:
        fileContent = exportData
          .map(m => `[${m.timestamp}] ${m.sender}: ${m.content}`)
          .join('\n\n');
        filename = `chat-export-${Date.now()}.txt`;
        mimeType = 'text/plain';
        break;
    }

    // Create and trigger download
    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error exporting messages:', error);
    throw error;
  }
};

export const exportConversationBackup = async (conversationId: string) => {
  try {
    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user:profiles(username, avatar_url)
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    // Get all messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(username, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    // Get pinned messages
    const { data: pinnedMessages } = await supabase
      .from('pinned_messages')
      .select('message_id')
      .eq('conversation_id', conversationId);

    const backup = {
      conversation,
      messages,
      pinnedMessages: pinnedMessages?.map(p => p.message_id) || [],
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
};
