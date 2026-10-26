import React, { useState, useEffect, useRef } from 'react';
import { Plus, Image as ImageIcon, Grid, Trash2, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePhotoAlbums } from '@/hooks/usePhotoAlbums';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PhotoAlbumsGridProps {
  userId?: string;
  editable?: boolean;
  className?: string;
}

export const PhotoAlbumsGrid = ({
  userId,
  editable = false,
  className
}: PhotoAlbumsGridProps) => {
  const { albums, loading, fetchAlbums, createAlbum, deleteAlbum, addPhotosToAlbum } = usePhotoAlbums();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumPublic, setNewAlbumPublic] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchAlbums(userId);
  }, [userId, fetchAlbums]);

  const handleCreate = async () => {
    if (!newAlbumName.trim()) return;
    await createAlbum(newAlbumName, undefined, newAlbumPublic);
    setNewAlbumName('');
    setNewAlbumPublic(false);
    setIsCreateOpen(false);
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedAlbum) return;
    setUploading(true);
    try {
      const uploadedUrls: { url: string }[] = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `album_${selectedAlbum}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('chat-media')
          .upload(filePath, file);
        if (!error && data) {
          const { data: pubData } = supabase.storage
            .from('chat-media')
            .getPublicUrl(filePath);
          uploadedUrls.push({ url: pubData.publicUrl });
        }
      }
      if (uploadedUrls.length > 0) {
        await addPhotosToAlbum(selectedAlbum, uploadedUrls);
      }
    } catch (err) {
      console.error('Error uploading photos:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 gap-3", className)}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-pulse bg-muted rounded-lg h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Grid className="w-4 h-4" />
          Photo Albums
        </h3>
        {editable && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                New Album
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Album</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="album-name">Album Name</Label>
                  <Input
                    id="album-name"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="My Photos"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="album-public">Make Public</Label>
                  <Switch
                    id="album-public"
                    checked={newAlbumPublic}
                    onCheckedChange={setNewAlbumPublic}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Create Album
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {albums.length === 0 ? (
        <Card className="p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No albums yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {albums.map(album => (
            <Card 
              key={album.id} 
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setSelectedAlbum(album.id)}
            >
              <div className="relative h-24 bg-muted">
                {album.coverPhotoUrl ? (
                  <img 
                    src={album.coverPhotoUrl} 
                    alt={album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                {editable && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAlbum(album.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="p-2">
                <h4 className="font-medium text-sm truncate">{album.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {album.photos.length} photo{album.photos.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Album Detail Modal */}
      <Dialog open={!!selectedAlbum} onOpenChange={() => setSelectedAlbum(null)}>
        <DialogContent className="max-w-lg">
          {selectedAlbum && (() => {
            const album = albums.find(a => a.id === selectedAlbum);
            if (!album) return null;
            return (
              <>
                <DialogHeader className="flex flex-row items-center justify-between pr-6">
                  <DialogTitle>{album.name}</DialogTitle>
                  {editable && (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleUploadPhotos}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-8 text-xs"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        {uploading ? 'Uploading...' : 'Add Photos'}
                      </Button>
                    </>
                  )}
                </DialogHeader>
                <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                  {album.photos.map(photo => (
                    <img
                      key={photo.id}
                      src={photo.photoUrl}
                      alt={photo.caption || ''}
                      className="w-full aspect-square object-cover rounded"
                    />
                  ))}
                  {album.photos.length === 0 && (
                    <p className="col-span-3 text-center text-muted-foreground py-8">
                      No photos in this album
                    </p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
