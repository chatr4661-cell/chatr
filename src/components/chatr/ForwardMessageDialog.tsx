import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface ForwardMessageDialogProps {
  message: any;
  onClose: () => void;
  userId: string;
}

export function ForwardMessageDialog({ message, onClose, userId }: ForwardMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const contacts = [
    { id: '1', name: 'Ammar', phone: '+923001234567' },
    { id: '2', name: 'Sanobar', phone: '+923007654321' },
    { id: '3', name: 'Ag go', phone: '+923009876543' },
  ];

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleForwardToChatr = (contactId: string) => {
    toast.success('Message forwarded successfully!');
    onClose();
  };

  const handleForwardToWhatsApp = (contact: any) => {
    const text = encodeURIComponent(message.content);
    const phone = contact.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="pl-10"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredContacts.map(contact => (
              <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow text-white flex items-center justify-center font-semibold">
                    {contact.name[0]}
                  </div>
                  <span className="font-medium">{contact.name}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleForwardToChatr(contact.id)}
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    CHATR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => handleForwardToWhatsApp(contact)}
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
