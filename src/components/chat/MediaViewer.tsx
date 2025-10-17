import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, File, Link as LinkIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MediaViewer: React.FC = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [media, setMedia] = React.useState<any[]>([]);
  const [links, setLinks] = React.useState<any[]>([]);
  const [files, setFiles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (conversationId) {
      loadMediaFiles();
    }
  }, [conversationId]);

  const loadMediaFiles = async () => {
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, message_type, media_url, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (messages) {
        const mediaItems = messages.filter(m => 
          m.message_type === 'image' || m.message_type === 'video'
        );
        const linkItems = messages.filter(m => 
          m.content?.includes('http://') || m.content?.includes('https://')
        );
        const fileItems = messages.filter(m => 
          m.message_type === 'file' || m.message_type === 'document'
        );

        setMedia(mediaItems);
        setLinks(linkItems);
        setFiles(fileItems);
      }
    } catch (error) {
      console.error('Error loading media:', error);
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Compact Header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur-sm px-3 py-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold">Media & Files</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="media" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-background h-10">
            <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
            <TabsTrigger value="links" className="text-xs">Links</TabsTrigger>
            <TabsTrigger value="files" className="text-xs">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="media" className="flex-1 overflow-y-auto p-2 m-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : media.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {media.map((item) => (
                  <div key={item.id} className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={item.media_url} 
                      alt="Media" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No media shared yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="links" className="flex-1 overflow-y-auto p-3 m-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : links.length > 0 ? (
              <div className="space-y-2">
                {links.map((item) => (
                  <a
                    key={item.id}
                    href={item.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-card border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <LinkIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{item.content}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <LinkIcon className="w-12 h-12 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No links shared yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="files" className="flex-1 overflow-y-auto p-3 m-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : files.length > 0 ? (
              <div className="space-y-2">
                {files.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-card border rounded-lg"
                  >
                    <File className="w-8 h-8 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{item.content}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <File className="w-12 h-12 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No files shared yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
