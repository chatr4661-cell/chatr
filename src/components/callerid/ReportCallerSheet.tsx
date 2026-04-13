import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, ShieldCheck, Phone, Bot, Briefcase, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReportCallerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber?: string;
  callerName?: string;
}

const REPORT_TYPES = [
  { value: 'spam', label: 'Spam', icon: Ban, color: 'bg-orange-500' },
  { value: 'scam', label: 'Scam', icon: AlertTriangle, color: 'bg-red-500' },
  { value: 'telemarketer', label: 'Telemarketer', icon: Phone, color: 'bg-yellow-500' },
  { value: 'robocall', label: 'Robocall', icon: Bot, color: 'bg-purple-500' },
  { value: 'fraud', label: 'Fraud', icon: Shield, color: 'bg-red-700' },
  { value: 'business', label: 'Business', icon: Briefcase, color: 'bg-blue-500' },
  { value: 'safe', label: 'Safe', icon: ShieldCheck, color: 'bg-green-500' },
] as const;

export const ReportCallerSheet: React.FC<ReportCallerSheetProps> = ({
  open,
  onOpenChange,
  phoneNumber = '',
  callerName = '',
}) => {
  const [phone, setPhone] = useState(phoneNumber);
  const [name, setName] = useState(callerName);
  const [selectedType, setSelectedType] = useState<string>('spam');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to report');
        return;
      }

      const { error } = await supabase.from('caller_reports' as any).insert({
        reporter_id: user.id,
        phone_number: phone.trim(),
        caller_name: name.trim() || null,
        report_type: selectedType,
        notes: notes.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('You already reported this number');
        } else {
          throw error;
        }
      } else {
        toast.success('Caller reported! Community thanks you 🛡️');
        onOpenChange(false);
        setPhone('');
        setName('');
        setSelectedType('spam');
        setNotes('');
      }
    } catch (err) {
      console.error('[ReportCaller]', err);
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Report Caller
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 pb-6">
          <Input
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
          />
          <Input
            placeholder="Caller name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <p className="text-sm text-muted-foreground mb-2">Report type</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Badge
                    key={type.value}
                    variant={selectedType === type.value ? 'default' : 'outline'}
                    className={`cursor-pointer px-3 py-1.5 ${
                      selectedType === type.value ? type.color + ' text-white border-0' : ''
                    }`}
                    onClick={() => setSelectedType(type.value)}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {type.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          <Textarea
            placeholder="Additional notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !phone.trim()}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Report Caller'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
