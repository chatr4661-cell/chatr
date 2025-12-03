import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Download, Trash2, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Design {
  id: string;
  name: string;
  design_data: any;
  template_id: string;
  is_published: boolean;
  created_at: string;
}

export const MyDesigns = () => {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDesigns();
  }, []);

  const loadDesigns = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('studio_user_designs' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setDesigns(data as any);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('studio_user_designs' as any)
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete design');
    } else {
      toast.success('Design deleted');
      setDesigns(designs.filter(d => d.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No saved designs yet. Create your first design above!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {designs.map((design) => (
        <Card key={design.id} className="overflow-hidden group">
          <CardContent className="p-0">
            <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
              <span className="text-4xl">🎨</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="gap-2 text-destructive"
                    onClick={() => handleDelete(design.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="p-3">
              <p className="font-medium text-sm truncate">{design.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(design.created_at), { addSuffix: true })}
              </p>
              {design.is_published && (
                <Badge variant="secondary" className="mt-1">Published</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
