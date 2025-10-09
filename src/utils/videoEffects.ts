export interface VideoEffect {
  id: string;
  name: string;
  apply: (canvas: HTMLCanvasElement, video: HTMLVideoElement) => void;
}

// Simple background blur using canvas blur
export const applyBackgroundBlur = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  blurAmount: number = 10
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.filter = `blur(${blurAmount}px)`;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
};

// Grayscale effect
export const applyGrayscale = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.filter = 'grayscale(100%)';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
};

// Brightness adjustment for low light
export const applyBrightnessBoost = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  brightness: number = 1.2
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.filter = `brightness(${brightness})`;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
};

// Portrait mode effect (simplified)
export const applyPortraitMode = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw video normally in center
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Apply vignette effect for portrait feel
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width / 4,
    canvas.width / 2, canvas.height / 2, canvas.width / 2
  );
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

export const VIDEO_EFFECTS: VideoEffect[] = [
  {
    id: 'none',
    name: 'None',
    apply: () => {}
  },
  {
    id: 'blur',
    name: 'Background Blur',
    apply: applyBackgroundBlur
  },
  {
    id: 'portrait',
    name: 'Portrait Mode',
    apply: applyPortraitMode
  },
  {
    id: 'grayscale',
    name: 'Grayscale',
    apply: applyGrayscale
  },
  {
    id: 'brighten',
    name: 'Brighten',
    apply: applyBrightnessBoost
  }
];
