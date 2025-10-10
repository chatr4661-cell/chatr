import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Radio, Users, Plus, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export const LiveRooms = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    loadRooms();
    
    // Subscribe to room changes
    const channel = supabase
      .channel('live-rooms')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'live_rooms'
      }, loadRooms)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRooms = async () => {
    const { data } = await supabase
      .from('live_rooms' as any)
      .select('*')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setRooms(data);
  };

  const createRoom = async () => {
    if (!newRoomTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('live_rooms' as any)
        .insert({
          title: newRoomTitle,
          host_id: user.id,
          is_public: true,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Room created!');
      setNewRoomTitle('');
      setShowCreate(false);
      loadRooms();
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  };

  const joinRoom = async (roomId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('room_participants' as any)
        .insert({
          room_id: roomId,
          user_id: user.id,
          is_speaking: false
        });

      // Load room details
      const { data: room } = await supabase
        .from('live_rooms' as any)
        .select('*')
        .eq('id', roomId)
        .single();

      setCurrentRoom(room);
      loadParticipants(roomId);
      toast.success('Joined room!');
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const loadParticipants = async (roomId: string) => {
    const { data } = await supabase
      .from('room_participants' as any)
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('room_id', roomId)
      .is('left_at', null);

    if (data) setParticipants(data);
  };

  const leaveRoom = () => {
    setCurrentRoom(null);
    setParticipants([]);
  };

  if (currentRoom) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">{currentRoom.title}</h3>
            <p className="text-sm text-muted-foreground">
              {participants.length} people listening
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={leaveRoom}>
            Leave
          </Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border">
              <Avatar className="h-8 w-8">
                <AvatarImage src={p.profiles?.avatar_url} />
                <AvatarFallback>{p.profiles?.username?.[0]}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm">{p.profiles?.username}</span>
              {p.is_speaking && (
                <Mic className="h-4 w-4 text-primary animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Live Rooms</h3>
          <Badge variant="secondary">{rooms.length} active</Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showCreate && (
        <div className="mb-4 space-y-2">
          <Input
            placeholder="Room title..."
            value={newRoomTitle}
            onChange={(e) => setNewRoomTitle(e.target.value)}
          />
          <Button onClick={createRoom} className="w-full">
            Create Room
          </Button>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
            onClick={() => joinRoom(room.id)}
          >
            <div className="flex-1">
              <p className="font-medium">{room.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {room.participant_count || 0} listening
                {room.topic && <span>• {room.topic}</span>}
              </div>
            </div>
            <Button size="sm" variant="ghost">
              Join
            </Button>
          </div>
        ))}

        {rooms.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No active rooms. Create one!
          </p>
        )}
      </div>
    </Card>
  );
};
