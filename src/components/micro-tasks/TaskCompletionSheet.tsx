import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Play, Pause, CheckCircle, Camera, Star, MapPin, 
  Loader2, AlertTriangle, IndianRupee 
} from 'lucide-react';
import type { MicroTask, TaskAssignment } from '@/hooks/useMicroTasks';

interface TaskCompletionSheetProps {
  task: MicroTask;
  assignment: TaskAssignment;
  onSubmit: (
    assignmentId: string,
    taskId: string,
    data: any
  ) => Promise<any>;
  onClose: () => void;
}

export function TaskCompletionSheet({ task, assignment, onSubmit, onClose }: TaskCompletionSheetProps) {
  const [open, setOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Audio task state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Photo task state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoHash, setPhotoHash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Rate task state
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  
  // Location state
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Get location if required
  useEffect(() => {
    if (task.geo_required) {
      getLocation();
    }
  }, [task.geo_required]);

  const getLocation = () => {
    setGettingLocation(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLocation(false);
      },
      (err) => {
        setLocationError('Please enable location access');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Audio playback handlers
  const toggleAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(task.audio_url || '');
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setAudioProgress(progress);
        }
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setAudioProgress(100);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Generate simple hash from file
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setPhotoHash(hash);
  };

  // Star rating component
  const StarRating = () => (
    <div className="flex gap-2 justify-center py-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => setRating(star)}
          className={`p-2 transition-all ${
            star <= rating 
              ? 'text-amber-400 scale-110' 
              : 'text-gray-300 hover:text-amber-200'
          }`}
        >
          <Star className={`w-10 h-10 ${star <= rating ? 'fill-current' : ''}`} />
        </button>
      ))}
    </div>
  );

  // Check if can submit
  const canSubmit = () => {
    if (task.geo_required && !location) return false;
    
    switch (task.task_type) {
      case 'audio_listen':
        return audioProgress >= 70 && selectedOption !== null;
      case 'photo_verify':
        return !!photoUrl;
      case 'rate_service':
        return rating > 0;
      default:
        return false;
    }
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!canSubmit()) return;
    
    setSubmitting(true);
    
    try {
      const data: any = {
        latitude: location?.lat,
        longitude: location?.lng,
      };

      switch (task.task_type) {
        case 'audio_listen':
          data.audio_listened_percent = Math.round(audioProgress);
          data.selected_option_index = parseInt(selectedOption || '0');
          break;
        case 'photo_verify':
          data.media_url = photoUrl;
          data.media_hash = photoHash;
          break;
        case 'rate_service':
          data.rating = rating;
          if (comment) data.voice_note_url = comment; // Using as text for v1
          break;
      }

      await onSubmit(assignment.id, task.id, data);
      setOpen(false);
      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-left">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Reward reminder */}
          <div className="flex items-center justify-center gap-2 bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
            <IndianRupee className="w-5 h-5 text-green-600" />
            <span className="text-green-700 dark:text-green-400 font-semibold">
              Earn ₹{task.reward_rupees} for completing this task
            </span>
          </div>

          {/* Location status for geo tasks */}
          {task.geo_required && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              location ? 'bg-green-50 dark:bg-green-950/30 text-green-700' : 
              locationError ? 'bg-red-50 dark:bg-red-950/30 text-red-700' :
              'bg-muted'
            }`}>
              {gettingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Getting your location...</span>
                </>
              ) : location ? (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>Location captured ✓</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>{locationError}</span>
                  <Button size="sm" variant="outline" onClick={getLocation}>
                    Retry
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Audio Listen Task */}
          {task.task_type === 'audio_listen' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-16 h-16 rounded-full"
                    onClick={toggleAudio}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </Button>
                  <div className="flex-1 mx-4">
                    <Progress value={audioProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Listen at least 70% to answer
                    </p>
                  </div>
                  {audioProgress >= 70 && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>
              </div>

              {audioProgress >= 70 && task.verification_options && (
                <div className="space-y-3">
                  <p className="font-medium">{task.verification_question}</p>
                  <RadioGroup value={selectedOption || ''} onValueChange={setSelectedOption}>
                    {(task.verification_options as string[]).map((option, idx) => (
                      <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                        <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                        <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </div>
          )}

          {/* Photo Verify Task */}
          {task.task_type === 'photo_verify' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{task.description}</p>
              
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
              />

              {photoUrl ? (
                <div className="relative">
                  <img 
                    src={photoUrl} 
                    alt="Captured" 
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Retake
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-48 border-dashed flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-12 h-12 text-muted-foreground" />
                  <span>Take Photo</span>
                </Button>
              )}
            </div>
          )}

          {/* Rate Service Task */}
          {task.task_type === 'rate_service' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {task.description}
              </p>
              
              <StarRating />

              {rating > 0 && (
                <div className="space-y-2">
                  <Label>Add a comment (optional)</Label>
                  <Textarea
                    placeholder="Share your experience..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            size="lg"
            disabled={!canSubmit() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit & Earn ₹{task.reward_rupees}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
