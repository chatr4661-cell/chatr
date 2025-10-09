import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Signal, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParticipantTileProps {
  userId: string;
  username: string;
  avatarUrl?: string;
  videoStream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isSpeaking: boolean;
  isPinned?: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor';
  onPin?: () => void;
}

export const ParticipantTile = ({
  username,
  avatarUrl,
  videoStream,
  audioEnabled,
  videoEnabled,
  isSpeaking,
  isPinned,
  connectionQuality,
  onPin,
}: ParticipantTileProps) => {
  const videoRef = (element: HTMLVideoElement | null) => {
    if (element && videoStream) {
      element.srcObject = videoStream;
    }
  };

  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
    }
  };

  const initials = username?.charAt(0).toUpperCase() || '?';

  return (
    <div
      className={cn(
        "relative bg-muted rounded-lg overflow-hidden aspect-video group",
        isSpeaking && "ring-4 ring-primary ring-opacity-75"
      )}
    >
      {videoEnabled && videoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
          <Avatar className="w-20 h-20 md:w-24 md:h-24">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-2xl md:text-3xl">{initials}</AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Top overlay - Connection quality and pin */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge variant="secondary" className="gap-1">
          <Signal className={cn("h-3 w-3", getQualityColor())} />
        </Badge>
        {onPin && (
          <button
            onClick={onPin}
            className="p-1.5 rounded-md bg-background/80 hover:bg-background transition-colors"
          >
            <Pin className={cn("h-4 w-4", isPinned && "fill-primary text-primary")} />
          </button>
        )}
      </div>

      {/* Bottom overlay - Name and audio status */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium truncate">{username}</span>
          <div className="flex-shrink-0 ml-2">
            {audioEnabled ? (
              <Mic className={cn("h-4 w-4 text-white", isSpeaking && "text-primary")} />
            ) : (
              <MicOff className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
