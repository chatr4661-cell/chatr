import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Camera, AlertCircle, CheckCircle, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PermissionPromptProps {
  type: 'voice' | 'video';
  onPermissionGranted: () => void;
  onCancel: () => void;
}

export function PermissionPrompt({ type, onPermissionGranted, onCancel }: PermissionPromptProps) {
  const [checking, setChecking] = useState(false);
  const [permissionState, setPermissionState] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkAndRequestPermissions = async () => {
    setChecking(true);
    setErrorMessage(null);
    
    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      };
      
      // Request permissions
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Success - stop the tracks immediately (we just needed to check)
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionState('granted');
      
      // Small delay to show success state
      setTimeout(() => {
        onPermissionGranted();
      }, 500);
      
    } catch (error: any) {
      console.error('Permission check failed:', error);
      setPermissionState('denied');
      
      // User-friendly error messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        if (type === 'video') {
          setErrorMessage('Camera and microphone access was blocked. Please allow access to make video calls.');
        } else {
          setErrorMessage('Microphone access was blocked. Please allow access to make voice calls.');
        }
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        if (type === 'video') {
          setErrorMessage('No camera or microphone found. Please connect a device and try again.');
        } else {
          setErrorMessage('No microphone found. Please connect a microphone and try again.');
        }
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('Your camera or microphone is being used by another app. Please close other apps and try again.');
      } else {
        setErrorMessage('Could not access your device. Please check your settings and try again.');
      }
    } finally {
      setChecking(false);
    }
  };

  const openSettings = () => {
    // Show instructions based on platform
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isAndroid) {
      setErrorMessage('Go to Settings → Apps → CHATR → Permissions → Enable Microphone' + (type === 'video' ? ' and Camera' : ''));
    } else if (isIOS) {
      setErrorMessage('Go to Settings → CHATR → Enable Microphone' + (type === 'video' ? ' and Camera' : ''));
    } else {
      setErrorMessage('Click the 🔒 icon in your browser address bar and allow access to Microphone' + (type === 'video' ? ' and Camera' : ''));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-white/10"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <motion.div
            animate={checking ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: checking ? Infinity : 0, ease: 'linear' }}
            className={`w-20 h-20 rounded-full flex items-center justify-center ${
              permissionState === 'granted' 
                ? 'bg-emerald-500/20' 
                : permissionState === 'denied'
                  ? 'bg-red-500/20'
                  : 'bg-primary/20'
            }`}
          >
            {permissionState === 'granted' ? (
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            ) : permissionState === 'denied' ? (
              <AlertCircle className="w-10 h-10 text-red-400" />
            ) : type === 'video' ? (
              <div className="flex gap-2">
                <Camera className="w-8 h-8 text-primary" />
                <Mic className="w-8 h-8 text-primary" />
              </div>
            ) : (
              <Mic className="w-10 h-10 text-primary" />
            )}
          </motion.div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          {permissionState === 'granted' 
            ? 'All Set! ✓' 
            : permissionState === 'denied'
              ? 'Permission Needed'
              : type === 'video' 
                ? 'Camera & Microphone Needed'
                : 'Microphone Needed'
          }
        </h2>

        {/* Description */}
        <p className="text-white/70 text-center mb-6 text-sm leading-relaxed">
          {permissionState === 'granted' ? (
            'Starting your call...'
          ) : permissionState === 'denied' ? (
            errorMessage || 'Please allow access to continue'
          ) : type === 'video' ? (
            <>
              To make video calls, we need access to your <span className="text-white font-medium">camera</span> and <span className="text-white font-medium">microphone</span>.
              <br /><br />
              When prompted, tap <span className="text-emerald-400 font-medium">"Allow"</span>
            </>
          ) : (
            <>
              To make voice calls, we need access to your <span className="text-white font-medium">microphone</span>.
              <br /><br />
              When prompted, tap <span className="text-emerald-400 font-medium">"Allow"</span>
            </>
          )}
        </p>

        {/* Visual guide for non-technical users */}
        {permissionState === 'prompt' && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-xs text-white/50 text-center mb-3">What you'll see:</p>
            <div className="bg-slate-700/50 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                  {type === 'video' ? <Camera className="w-4 h-4 text-primary" /> : <Mic className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1">
                  <p className="text-white text-xs font-medium">Allow access?</p>
                  <p className="text-white/50 text-[10px]">{type === 'video' ? 'Camera and microphone' : 'Microphone'}</p>
                </div>
                <div className="flex gap-1">
                  <span className="text-[10px] bg-slate-600 px-2 py-0.5 rounded text-white/70">Block</span>
                  <span className="text-[10px] bg-emerald-500 px-2 py-0.5 rounded text-white font-medium">Allow ✓</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {permissionState === 'denied' ? (
            <>
              <Button
                onClick={checkAndRequestPermissions}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6 rounded-xl"
                disabled={checking}
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${checking ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
              <Button
                onClick={openSettings}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 py-6 rounded-xl"
              >
                <Settings className="w-5 h-5 mr-2" />
                How to Enable
              </Button>
              <Button
                onClick={onCancel}
                variant="ghost"
                className="w-full text-white/50 hover:text-white hover:bg-white/5 py-4"
              >
                Cancel Call
              </Button>
            </>
          ) : permissionState === 'granted' ? (
            <div className="flex justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5 }}
                className="text-emerald-400 font-medium"
              >
                Connecting...
              </motion.div>
            </div>
          ) : (
            <>
              <Button
                onClick={checkAndRequestPermissions}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-6 rounded-xl text-lg"
                disabled={checking}
              >
                {checking ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    {type === 'video' ? <Camera className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
                    Allow & Continue
                  </>
                )}
              </Button>
              <Button
                onClick={onCancel}
                variant="ghost"
                className="w-full text-white/50 hover:text-white hover:bg-white/5 py-4"
              >
                Not Now
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
