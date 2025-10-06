import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface VaccinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const VaccinationDialog = ({ open, onOpenChange, onSuccess }: VaccinationDialogProps) => {
  const [vaccineName, setVaccineName] = useState('');
  const [doseNumber, setDoseNumber] = useState('1');
  const [dateAdministered, setDateAdministered] = useState<Date>();
  const [nextDoseDate, setNextDoseDate] = useState<Date>();
  const [administeredBy, setAdministeredBy] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!vaccineName || !dateAdministered) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('vaccination_records')
        .insert({
          user_id: user.id,
          vaccine_name: vaccineName,
          dose_number: parseInt(doseNumber),
          date_administered: format(dateAdministered, 'yyyy-MM-dd'),
          next_dose_date: nextDoseDate ? format(nextDoseDate, 'yyyy-MM-dd') : null,
          administered_by: administeredBy || null,
          batch_number: batchNumber || null,
          notes: notes || null
        });

      if (error) throw error;

      toast.success('Vaccination record added successfully!');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error adding vaccination:', error);
      toast.error('Failed to add vaccination record');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setVaccineName('');
    setDoseNumber('1');
    setDateAdministered(undefined);
    setNextDoseDate(undefined);
    setAdministeredBy('');
    setBatchNumber('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vaccination Record</DialogTitle>
          <DialogDescription>Record a new vaccination</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="vaccine">Vaccine Name *</Label>
            <Input
              id="vaccine"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              placeholder="e.g., COVID-19, Influenza"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dose">Dose Number</Label>
              <Input
                id="dose"
                type="number"
                min="1"
                value={doseNumber}
                onChange={(e) => setDoseNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Date Administered *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateAdministered ? format(dateAdministered, 'PPP') : <span>Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateAdministered}
                    onSelect={setDateAdministered}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label>Next Dose Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextDoseDate ? format(nextDoseDate, 'PPP') : <span>Pick date (optional)</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={nextDoseDate}
                  onSelect={setNextDoseDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="administeredBy">Administered By</Label>
            <Input
              id="administeredBy"
              value={administeredBy}
              onChange={(e) => setAdministeredBy(e.target.value)}
              placeholder="Doctor/Clinic name"
            />
          </div>

          <div>
            <Label htmlFor="batch">Batch Number</Label>
            <Input
              id="batch"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any side effects or additional information"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Add Record'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
