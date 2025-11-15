import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Image, Video, Calendar } from "lucide-react";

export function WorldPostCreator({ worldId }: { worldId: string }) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"text" | "image" | "video" | "poll" | "event">("text");
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error("Please write something");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("world_posts" as any)
        .insert({
          world_id: worldId,
          user_id: user.id,
          content,
          post_type: postType,
        });

      if (error) throw error;

      toast.success("Posted successfully!");
      setContent("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <Textarea
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="resize-none"
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={postType === "text" ? "default" : "ghost"}
            size="sm"
            onClick={() => setPostType("text")}
          >
            Text
          </Button>
          <Button
            variant={postType === "image" ? "default" : "ghost"}
            size="sm"
            onClick={() => setPostType("image")}
          >
            <Image className="h-4 w-4" />
          </Button>
          <Button
            variant={postType === "video" ? "default" : "ghost"}
            size="sm"
            onClick={() => setPostType("video")}
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button
            variant={postType === "event" ? "default" : "ghost"}
            size="sm"
            onClick={() => setPostType("event")}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={handlePost} disabled={loading}>
          {loading ? "Posting..." : "Post"}
        </Button>
      </div>
    </Card>
  );
}
