export interface Ringtone {
  id: string;
  name: string;
  category: 'classic' | 'modern' | 'nature' | 'melodies';
  path: string;
}

export const RINGTONES: Ringtone[] = [
  // Classic (5)
  { id: 'classic-1', name: 'Classic Bell', category: 'classic', path: '/notification.mp3' },
  { id: 'classic-2', name: 'Traditional Ring', category: 'classic', path: '/notification.mp3' },
  { id: 'classic-3', name: 'Old Phone', category: 'classic', path: '/notification.mp3' },
  { id: 'classic-4', name: 'Retro Chime', category: 'classic', path: '/notification.mp3' },
  { id: 'classic-5', name: 'Vintage Alert', category: 'classic', path: '/notification.mp3' },
  
  // Modern (5)
  { id: 'modern-1', name: 'Digital Pulse', category: 'modern', path: '/notification.mp3' },
  { id: 'modern-2', name: 'Tech Beat', category: 'modern', path: '/notification.mp3' },
  { id: 'modern-3', name: 'Synth Wave', category: 'modern', path: '/notification.mp3' },
  { id: 'modern-4', name: 'Future Sound', category: 'modern', path: '/notification.mp3' },
  { id: 'modern-5', name: 'Electric Pop', category: 'modern', path: '/notification.mp3' },
  
  // Nature (5)
  { id: 'nature-1', name: 'Birdsong', category: 'nature', path: '/notification.mp3' },
  { id: 'nature-2', name: 'Ocean Waves', category: 'nature', path: '/notification.mp3' },
  { id: 'nature-3', name: 'Rain Drops', category: 'nature', path: '/notification.mp3' },
  { id: 'nature-4', name: 'Wind Chimes', category: 'nature', path: '/notification.mp3' },
  { id: 'nature-5', name: 'Forest Sounds', category: 'nature', path: '/notification.mp3' },
  
  // Melodies (5)
  { id: 'melody-1', name: 'Piano Tune', category: 'melodies', path: '/notification.mp3' },
  { id: 'melody-2', name: 'Guitar Riff', category: 'melodies', path: '/notification.mp3' },
  { id: 'melody-3', name: 'Marimba', category: 'melodies', path: '/notification.mp3' },
  { id: 'melody-4', name: 'Harp Melody', category: 'melodies', path: '/notification.mp3' },
  { id: 'melody-5', name: 'Bells Harmony', category: 'melodies', path: '/notification.mp3' },
];

export const CALL_RINGTONES: Ringtone[] = [
  // Classic (5)
  { id: 'call-classic-1', name: 'Classic Ring', category: 'classic', path: '/ringtone.mp3' },
  { id: 'call-classic-2', name: 'Traditional Call', category: 'classic', path: '/ringtone.mp3' },
  { id: 'call-classic-3', name: 'Old School', category: 'classic', path: '/ringtone.mp3' },
  { id: 'call-classic-4', name: 'Rotary Phone', category: 'classic', path: '/ringtone.mp3' },
  { id: 'call-classic-5', name: 'Office Phone', category: 'classic', path: '/ringtone.mp3' },
  
  // Modern (5)
  { id: 'call-modern-1', name: 'Digital Ring', category: 'modern', path: '/ringtone.mp3' },
  { id: 'call-modern-2', name: 'Tech Tone', category: 'modern', path: '/ringtone.mp3' },
  { id: 'call-modern-3', name: 'Synth Call', category: 'modern', path: '/ringtone.mp3' },
  { id: 'call-modern-4', name: 'Future Ring', category: 'modern', path: '/ringtone.mp3' },
  { id: 'call-modern-5', name: 'Electronic Beat', category: 'modern', path: '/ringtone.mp3' },
  
  // Nature (5)
  { id: 'call-nature-1', name: 'Morning Birds', category: 'nature', path: '/ringtone.mp3' },
  { id: 'call-nature-2', name: 'Peaceful Ocean', category: 'nature', path: '/ringtone.mp3' },
  { id: 'call-nature-3', name: 'Soft Rain', category: 'nature', path: '/ringtone.mp3' },
  { id: 'call-nature-4', name: 'Bamboo Chimes', category: 'nature', path: '/ringtone.mp3' },
  { id: 'call-nature-5', name: 'Jungle Sounds', category: 'nature', path: '/ringtone.mp3' },
  
  // Melodies (5)
  { id: 'call-melody-1', name: 'Piano Serenade', category: 'melodies', path: '/ringtone.mp3' },
  { id: 'call-melody-2', name: 'Acoustic Guitar', category: 'melodies', path: '/ringtone.mp3' },
  { id: 'call-melody-3', name: 'Marimba Call', category: 'melodies', path: '/ringtone.mp3' },
  { id: 'call-melody-4', name: 'Harp Ring', category: 'melodies', path: '/ringtone.mp3' },
  { id: 'call-melody-5', name: 'Orchestral', category: 'melodies', path: '/ringtone.mp3' },
];
