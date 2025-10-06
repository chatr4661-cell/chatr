export interface Ringtone {
  id: string;
  name: string;
  category: 'classic' | 'modern' | 'nature' | 'melodies';
  path: string;
}

export const RINGTONES: Ringtone[] = [
  // Classic (5)
  { id: 'classic-1', name: 'Nokia Scratch', category: 'classic', path: '/ringtones/nokia-scratch.mp3' },
  { id: 'classic-2', name: 'Perfect Ring', category: 'classic', path: '/ringtones/perfect-ring.mp3' },
  { id: 'classic-3', name: 'Message Notify', category: 'classic', path: '/ringtones/message-notify.mp3' },
  { id: 'classic-4', name: 'Nokia Scratch', category: 'classic', path: '/ringtones/nokia-scratch.mp3' },
  { id: 'classic-5', name: 'Perfect Ring', category: 'classic', path: '/ringtones/perfect-ring.mp3' },
  
  // Modern (5)
  { id: 'modern-1', name: 'Trap Text Tone', category: 'modern', path: '/ringtones/trap-text.mp3' },
  { id: 'modern-2', name: 'I Got 5 On It', category: 'modern', path: '/ringtones/i-got-5.mp3' },
  { id: 'modern-3', name: 'Trap Text Tone', category: 'modern', path: '/ringtones/trap-text.mp3' },
  { id: 'modern-4', name: 'I Got 5 On It', category: 'modern', path: '/ringtones/i-got-5.mp3' },
  { id: 'modern-5', name: 'Trap Text Tone', category: 'modern', path: '/ringtones/trap-text.mp3' },
  
  // Nature (5)
  { id: 'nature-1', name: 'Frog SMS', category: 'nature', path: '/ringtones/frog-sms.mp3' },
  { id: 'nature-2', name: 'Frog SMS', category: 'nature', path: '/ringtones/frog-sms.mp3' },
  { id: 'nature-3', name: 'Frog SMS', category: 'nature', path: '/ringtones/frog-sms.mp3' },
  { id: 'nature-4', name: 'Message Notify', category: 'nature', path: '/ringtones/message-notify.mp3' },
  { id: 'nature-5', name: 'Message Notify', category: 'nature', path: '/ringtones/message-notify.mp3' },
  
  // Melodies (5)
  { id: 'melody-1', name: 'Ring Reggae', category: 'melodies', path: '/ringtones/ring-reggae.mp3' },
  { id: 'melody-2', name: 'Perfect Ring', category: 'melodies', path: '/ringtones/perfect-ring.mp3' },
  { id: 'melody-3', name: 'Ring Reggae', category: 'melodies', path: '/ringtones/ring-reggae.mp3' },
  { id: 'melody-4', name: 'I Got 5 On It', category: 'melodies', path: '/ringtones/i-got-5.mp3' },
  { id: 'melody-5', name: 'Ring Reggae', category: 'melodies', path: '/ringtones/ring-reggae.mp3' },
];

export const CALL_RINGTONES: Ringtone[] = [
  // Classic (5)
  { id: 'call-classic-1', name: 'Perfect Ring', category: 'classic', path: '/ringtones/perfect-ring.mp3' },
  { id: 'call-classic-2', name: 'Nokia Scratch', category: 'classic', path: '/ringtones/nokia-scratch.mp3' },
  { id: 'call-classic-3', name: 'Perfect Ring', category: 'classic', path: '/ringtones/perfect-ring.mp3' },
  { id: 'call-classic-4', name: 'Message Notify', category: 'classic', path: '/ringtones/message-notify.mp3' },
  { id: 'call-classic-5', name: 'Nokia Scratch', category: 'classic', path: '/ringtones/nokia-scratch.mp3' },
  
  // Modern (5)
  { id: 'call-modern-1', name: 'Trap Text Tone', category: 'modern', path: '/ringtones/trap-text.mp3' },
  { id: 'call-modern-2', name: 'I Got 5 On It', category: 'modern', path: '/ringtones/i-got-5.mp3' },
  { id: 'call-modern-3', name: 'Trap Text Tone', category: 'modern', path: '/ringtones/trap-text.mp3' },
  { id: 'call-modern-4', name: 'I Got 5 On It', category: 'modern', path: '/ringtones/i-got-5.mp3' },
  { id: 'call-modern-5', name: 'Trap Text Tone', category: 'modern', path: '/ringtones/trap-text.mp3' },
  
  // Nature (5)
  { id: 'call-nature-1', name: 'Frog SMS', category: 'nature', path: '/ringtones/frog-sms.mp3' },
  { id: 'call-nature-2', name: 'Frog SMS', category: 'nature', path: '/ringtones/frog-sms.mp3' },
  { id: 'call-nature-3', name: 'Message Notify', category: 'nature', path: '/ringtones/message-notify.mp3' },
  { id: 'call-nature-4', name: 'Frog SMS', category: 'nature', path: '/ringtones/frog-sms.mp3' },
  { id: 'call-nature-5', name: 'Message Notify', category: 'nature', path: '/ringtones/message-notify.mp3' },
  
  // Melodies (5)
  { id: 'call-melody-1', name: 'Ring Reggae', category: 'melodies', path: '/ringtones/ring-reggae.mp3' },
  { id: 'call-melody-2', name: 'Perfect Ring', category: 'melodies', path: '/ringtones/perfect-ring.mp3' },
  { id: 'call-melody-3', name: 'Ring Reggae', category: 'melodies', path: '/ringtones/ring-reggae.mp3' },
  { id: 'call-melody-4', name: 'I Got 5 On It', category: 'melodies', path: '/ringtones/i-got-5.mp3' },
  { id: 'call-melody-5', name: 'Ring Reggae', category: 'melodies', path: '/ringtones/ring-reggae.mp3' },
];
