import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export const PrivacySettings = ({ userId }: { userId?: string }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Show Online Status</Label>
            <p className="text-sm text-muted-foreground">Let others see when you're online</p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Show Last Seen</Label>
            <p className="text-sm text-muted-foreground">Display your last active time</p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Show Profile Photo</Label>
            <p className="text-sm text-muted-foreground">Make your photo visible to contacts</p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Allow Calls</Label>
            <p className="text-sm text-muted-foreground">Enable voice and video calls</p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>
    </div>
  );
};
