import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Phone, Mail } from 'lucide-react';

interface ContactMessageProps {
  content: string;
}

export const ContactMessage: React.FC<ContactMessageProps> = ({ content }) => {
  // Parse contact info from content: "[Contact] Name - phone"
  const contactInfo = content.replace('[Contact] ', '').split(' - ');
  const name = contactInfo[0] || 'Unknown Contact';
  const phoneOrEmail = contactInfo[1]?.replace('@chatr.local', '') || '';

  return (
    <Card className="p-4 bg-card border max-w-[280px]">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{name}</h4>
          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
            {phoneOrEmail.includes('@') ? (
              <>
                <Mail className="w-3 h-3" />
                <span className="truncate">{phoneOrEmail}</span>
              </>
            ) : (
              <>
                <Phone className="w-3 h-3" />
                <span className="truncate">{phoneOrEmail}</span>
              </>
            )}
          </div>
          <Button size="sm" className="mt-3 w-full">
            View Contact
          </Button>
        </div>
      </div>
    </Card>
  );
};
