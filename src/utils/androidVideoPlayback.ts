import { Capacitor } from '@capacitor/core';

/**
 * Android WebView Video Playback Helper
 * 
 * Fixes the issue where video freezes on Android WebView while audio works.
 * Android WebView often delivers video tracks in "muted" state initially,
 * requiring aggressive retry logic and srcObject re-assignment.
 */

const isAndroidWebView = () => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

const isAnyWebView = () => {
  return Capacitor.isNativePlatform();
};

interface VideoPlaybackOptions {
  maxRetries?: number;
  retryIntervalMs?: number;
  onPlaybackStarted?: () => void;
  onPlaybackFailed?: () => void;
}

/**
 * Aggressive video playback retry for Android WebView
 * Implements multiple strategies to ensure video plays:
 * 1. Immediate play attempt
 * 2. Muted play then unmute
 * 3. srcObject re-assignment
 * 4. Periodic retry loop
 */
export function startAggressiveVideoPlayback(
  videoElement: HTMLVideoElement,
  stream: MediaStream,
  options: VideoPlaybackOptions = {}
): () => void {
  const {
    maxRetries = 10,
    retryIntervalMs = 500,
    onPlaybackStarted,
    onPlaybackFailed,
  } = options;

  let retryCount = 0;
  let retryTimer: NodeJS.Timeout | null = null;
  let isCleanedUp = false;
  let playbackStarted = false;

  const log = (msg: string) => console.log(`📺 [AndroidVideo] ${msg}`);

  const checkVideoPlaying = (): boolean => {
    // Check if video is actually playing
    // readyState >= 2 means HAVE_CURRENT_DATA - can render current frame
    // Many browsers take time to report dimensions, so we don't strictly require them
    const hasData = videoElement.readyState >= 2;
    const hasDimensions = videoElement.videoWidth > 0 && videoElement.videoHeight > 0;
    const isPlaying = !videoElement.paused;
    
    // CRITICAL FIX: Check if stream has active video tracks
    // This is more reliable than waiting for video element dimensions
    const hasActiveVideoTracks = stream.getVideoTracks().some(
      t => t.enabled && t.readyState === 'live'
    );
    
    // For ALL browsers: if we have data, it's playing, and we have active tracks, 
    // consider it playing even without dimensions (dimensions may take a moment)
    if (hasData && isPlaying && hasActiveVideoTracks) {
      return true;
    }
    
    // Fallback: also accept if dimensions are reported
    return isPlaying && hasData && hasDimensions;
  };

  const attemptPlay = async (): Promise<boolean> => {
    if (isCleanedUp || playbackStarted) return playbackStarted;

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      log('No video tracks in stream');
      return false;
    }

    const track = videoTracks[0];
    log(`Attempt ${retryCount + 1}/${maxRetries}: track=${track.readyState}, muted=${track.muted}, enabled=${track.enabled}`);

    try {
      // Strategy 1: Direct play
      videoElement.muted = false;
      videoElement.volume = 1.0;
      await videoElement.play();
      
      // Verify it's actually playing video (not just audio)
      await new Promise(r => setTimeout(r, 100));
      if (checkVideoPlaying()) {
        log('✅ Video playing (direct)');
        playbackStarted = true;
        onPlaybackStarted?.();
        return true;
      }
    } catch (e: any) {
      log(`Direct play failed: ${e.name}`);
    }

    try {
      // Strategy 2: Muted play then unmute
      videoElement.muted = true;
      await videoElement.play();
      await new Promise(r => setTimeout(r, 50));
      videoElement.muted = false;
      
      if (checkVideoPlaying()) {
        log('✅ Video playing (muted->unmuted)');
        playbackStarted = true;
        onPlaybackStarted?.();
        return true;
      }
    } catch (e: any) {
      log(`Muted play failed: ${e.name}`);
    }

    // Strategy 3: Re-assign srcObject (works for all browsers, critical for WebViews)
    // Apply earlier on desktop browsers (retryCount > 1) since they're usually faster
    const shouldReassign = isAndroidWebView() ? retryCount > 2 : retryCount > 1;
    if (shouldReassign) {
      log('Re-assigning srcObject');
      videoElement.srcObject = null;
      await new Promise(r => setTimeout(r, 50));
      videoElement.srcObject = stream;
      videoElement.muted = true;
      
      try {
        await videoElement.play();
        await new Promise(r => setTimeout(r, 100));
        videoElement.muted = false;
        
        if (checkVideoPlaying()) {
          log('✅ Video playing (srcObject re-assign)');
          playbackStarted = true;
          onPlaybackStarted?.();
          return true;
        }
      } catch (e) {
        log('srcObject re-assign play failed');
      }
    }
    
    // Strategy 4: Check if we're playing but dimensions not yet reported
    // This happens on some desktop browsers
    if (retryCount >= 3 && !videoElement.paused && videoElement.readyState >= 2) {
      log('✅ Video playing (readyState check, awaiting dimensions)');
      playbackStarted = true;
      onPlaybackStarted?.();
      return true;
    }

    return false;
  };

  const retryLoop = async () => {
    if (isCleanedUp || playbackStarted) return;

    const success = await attemptPlay();
    
    if (!success && retryCount < maxRetries) {
      retryCount++;
      retryTimer = setTimeout(retryLoop, retryIntervalMs);
    } else if (!success) {
      log(`❌ Video playback failed after ${maxRetries} attempts`);
      onPlaybackFailed?.();
    }
  };

  // Initial setup
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  videoElement.srcObject = stream;

  // Start retry loop
  retryLoop();

  // Also listen to track events for recovery
  const videoTracks = stream.getVideoTracks();
  const trackHandlers: Array<{ track: MediaStreamTrack; handler: () => void }> = [];

  videoTracks.forEach(track => {
    const onUnmute = () => {
      log('Track unmuted - attempting play');
      // Re-assign srcObject on unmute (critical fix)
      if (!playbackStarted && videoElement) {
        videoElement.srcObject = stream;
        attemptPlay();
      }
    };

    const onEnded = () => {
      log('⚠️ Video track ended');
      if (!isCleanedUp) {
        onPlaybackFailed?.();
      }
    };

    track.onunmute = onUnmute;
    track.onended = onEnded;
    track.onmute = () => log('Track muted');
    
    trackHandlers.push({ track, handler: onUnmute });
  });

  // Cleanup function
  return () => {
    isCleanedUp = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    trackHandlers.forEach(({ track }) => {
      track.onunmute = null;
      track.onended = null;
      track.onmute = null;
    });
    log('Cleanup complete');
  };
}

/**
 * Attach comprehensive track event handlers for video recovery
 */
export function attachVideoTrackRecoveryHandlers(
  stream: MediaStream,
  videoElement: HTMLVideoElement,
  onVideoActive: (active: boolean) => void
): () => void {
  const log = (msg: string) => console.log(`📺 [TrackRecovery] ${msg}`);
  const cleanupFns: Array<() => void> = [];

  const handleTrackChange = async () => {
    const videoTracks = stream.getVideoTracks();
    
    // CRITICAL FIX: More lenient active check
    // Don't require !muted - tracks can be temporarily muted during setup
    const hasActiveVideo = videoTracks.some(t => t.enabled && t.readyState === 'live');
    const hasAnyVideo = videoTracks.length > 0;
    
    log(`Track change: ${videoTracks.length} tracks, active=${hasActiveVideo}, any=${hasAnyVideo}`);
    
    // OPTIMISTIC: If we have ANY video track, try to enable video
    if (hasAnyVideo && videoElement) {
      // Re-assign and play
      videoElement.srcObject = stream;
      try {
        videoElement.muted = true;
        await videoElement.play();
        await new Promise(r => setTimeout(r, 50));
        videoElement.muted = false;
        // Enable video if track is live, even if muted initially
        if (hasActiveVideo) {
          onVideoActive(true);
        }
      } catch (e) {
        log('Recovery play failed');
        // Still enable video visibility if track exists - user should see something
        if (hasActiveVideo) {
          onVideoActive(true);
        }
      }
    } else {
      onVideoActive(false);
    }
  };

  // Stream-level handlers
  stream.onaddtrack = (e) => {
    log(`Track added: ${e.track.kind}`);
    if (e.track.kind === 'video') {
      attachTrackHandlers(e.track);
      handleTrackChange();
    }
  };

  stream.onremovetrack = (e) => {
    log(`Track removed: ${e.track.kind}`);
    if (e.track.kind === 'video') {
      handleTrackChange();
    }
  };

  // Per-track handlers
  const attachTrackHandlers = (track: MediaStreamTrack) => {
    if (track.kind !== 'video') return;
    
    track.onunmute = () => {
      log('Video unmuted');
      handleTrackChange();
    };
    
    track.onmute = () => {
      log('Video muted');
      onVideoActive(false);
    };
    
    track.onended = () => {
      log('Video ended');
      onVideoActive(false);
    };
  };

  // Attach to existing tracks
  stream.getVideoTracks().forEach(attachTrackHandlers);

  cleanupFns.push(() => {
    stream.onaddtrack = null;
    stream.onremovetrack = null;
    stream.getVideoTracks().forEach(track => {
      track.onunmute = null;
      track.onmute = null;
      track.onended = null;
    });
  });

  return () => cleanupFns.forEach(fn => fn());
}
