import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ContactInfoScreen } from './chat/ContactInfoScreen';

interface Contact {
  id: string;
  username: string;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
  status: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  age: number | null;
  gender: string | null;
}

interface UserInfoSidebarProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserInfoSidebar = ({ contact, open, onOpenChange }: UserInfoSidebarProps) => {
  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 w-full sm:max-w-md overflow-y-auto">
        <ContactInfoScreen 
          contact={{
            id: contact.id,
            username: contact.username,
            avatar_url: contact.avatar_url || undefined,
            phone_number: contact.phone_number || undefined,
            status: contact.status || undefined
          }}
          conversationId={contact.id}
          onClose={() => onOpenChange(false)}
          onCall={(type) => {
            onOpenChange(false);
            console.log('Call type:', type);
          }}
        />
      </SheetContent>
    </Sheet>
  );
};
