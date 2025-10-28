/**
 * Finite State Machine for Gesture Recognition
 * States: idle → detecting_open → detecting_close → captured
 * Requires stable N frames to prevent false positives
 */

export type GestureState = 'idle' | 'detecting_open' | 'detecting_close' | 'captured' | 'cooldown';

export interface HandLandmarks {
  landmarks: Array<{ x: number; y: number; z: number }>;
  handedness: string;
}

export interface GestureFSMConfig {
  stableFrames: number;           // Required stable frames (default: 6)
  openPalmThreshold: number;      // Distance threshold for open palm (default: 0.15)
  closedFistThreshold: number;    // Distance threshold for closed fist (default: 0.08)
  boundingBoxMinArea: number;     // Min bounding box area (default: 0.02)
  boundingBoxMaxArea: number;     // Max bounding box area (default: 0.15)
  cooldownMs: number;             // Cooldown between captures (default: 2000ms)
  distanceCheckEnabled: boolean;  // Enable distance-based hand size check
}

const DEFAULT_CONFIG: GestureFSMConfig = {
  stableFrames: 6,
  openPalmThreshold: 0.15,
  closedFistThreshold: 0.08,
  boundingBoxMinArea: 0.02,
  boundingBoxMaxArea: 0.15,
  cooldownMs: 2000,
  distanceCheckEnabled: true,
};

export class GestureFSM {
  private state: GestureState = 'idle';
  private config: GestureFSMConfig;
  private stableFrameCount = 0;
  private lastCaptureTime = 0;
  private onStateChange?: (state: GestureState) => void;
  private onCapture?: () => void;

  constructor(config?: Partial<GestureFSMConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public setCallbacks(onStateChange: (state: GestureState) => void, onCapture: () => void) {
    this.onStateChange = onStateChange;
    this.onCapture = onCapture;
  }

  public processFrame(hands: HandLandmarks[]): void {
    if (hands.length === 0) {
      this.reset();
      return;
    }

    // Handle cooldown
    if (this.state === 'cooldown') {
      if (Date.now() - this.lastCaptureTime > this.config.cooldownMs) {
        this.transitionTo('idle');
      }
      return;
    }

    const hand = hands[0];
    
    // Check bounding box area (hand distance estimation)
    const boundingBox = this.calculateBoundingBox(hand.landmarks);
    if (!this.isValidHandDistance(boundingBox.area)) {
      this.reset();
      return;
    }

    // Detect gesture
    const isOpenPalm = this.isOpenPalm(hand.landmarks);
    const isClosedFist = this.isClosedFist(hand.landmarks);

    // State machine transitions
    switch (this.state) {
      case 'idle':
        if (isOpenPalm) {
          this.stableFrameCount++;
          if (this.stableFrameCount >= this.config.stableFrames) {
            this.transitionTo('detecting_open');
          }
        } else {
          this.stableFrameCount = 0;
        }
        break;

      case 'detecting_open':
        if (isClosedFist) {
          this.stableFrameCount++;
          if (this.stableFrameCount >= this.config.stableFrames) {
            this.transitionTo('captured');
            this.lastCaptureTime = Date.now();
            this.onCapture?.();
            setTimeout(() => this.transitionTo('cooldown'), 100);
          }
        } else if (!isOpenPalm) {
          this.transitionTo('idle');
        } else {
          this.stableFrameCount = 0;
        }
        break;
    }
  }

  private isOpenPalm(landmarks: Array<{ x: number; y: number; z: number }>): boolean {
    // Calculate average distance between fingertips and palm base
    const palmBase = landmarks[0]; // Wrist
    const fingertips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips
    
    let totalDistance = 0;
    fingertips.forEach(idx => {
      const tip = landmarks[idx];
      totalDistance += this.euclideanDistance(palmBase, tip);
    });
    
    const avgDistance = totalDistance / fingertips.length;
    return avgDistance > this.config.openPalmThreshold;
  }

  private isClosedFist(landmarks: Array<{ x: number; y: number; z: number }>): boolean {
    // Calculate average distance between fingertips and palm base
    const palmBase = landmarks[0];
    const fingertips = [4, 8, 12, 16, 20];
    
    let totalDistance = 0;
    fingertips.forEach(idx => {
      const tip = landmarks[idx];
      totalDistance += this.euclideanDistance(palmBase, tip);
    });
    
    const avgDistance = totalDistance / fingertips.length;
    return avgDistance < this.config.closedFistThreshold;
  }

  private calculateBoundingBox(landmarks: Array<{ x: number; y: number; z: number }>) {
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    
    landmarks.forEach(lm => {
      minX = Math.min(minX, lm.x);
      minY = Math.min(minY, lm.y);
      maxX = Math.max(maxX, lm.x);
      maxY = Math.max(maxY, lm.y);
    });
    
    const width = maxX - minX;
    const height = maxY - minY;
    const area = width * height;
    
    return { minX, minY, maxX, maxY, width, height, area };
  }

  private isValidHandDistance(area: number): boolean {
    if (!this.config.distanceCheckEnabled) return true;
    return area >= this.config.boundingBoxMinArea && area <= this.config.boundingBoxMaxArea;
  }

  private euclideanDistance(p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }): number {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2)
    );
  }

  private transitionTo(newState: GestureState): void {
    this.state = newState;
    this.stableFrameCount = 0;
    this.onStateChange?.(newState);
    console.log(`[GestureFSM] Transition to: ${newState}`);
  }

  private reset(): void {
    if (this.state !== 'idle' && this.state !== 'cooldown') {
      this.transitionTo('idle');
    }
    this.stableFrameCount = 0;
  }

  public getState(): GestureState {
    return this.state;
  }

  public forceReset(): void {
    this.state = 'idle';
    this.stableFrameCount = 0;
    this.onStateChange?.('idle');
  }
}
