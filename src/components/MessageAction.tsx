import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
}

export const MessageAction = ({ icon: Icon, label, onClick, color = 'text-primary' }: MessageActionProps) => {
  return (
    <Button
      variant="ghost"
      className="flex flex-col items-center gap-1 h-auto py-3"
      onClick={onClick}
    >
      <div className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </Button>
  );
};
