import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Hand, Globe, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GestureOverlay from '@/components/grab/GestureOverlay';
import WebRTCTransfer from '@/components/transfer/WebRTCTransfer';
import AIBrowser from '@/components/browser/AIBrowser';

export default function GrabAndBrowse() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<'gesture' | 'browser' | null>(null);
  const [capturedFile, setCapturedFile] = useState<{ blob: Blob; name: string } | null>(null);

  const handleScreenshotCapture = (blob: Blob) => {
    const fileName = `chatr-grab-${Date.now()}.png`;
    setCapturedFile({ blob, name: fileName });
    setActiveMode(null);
  };

  if (activeMode === 'gesture') {
    return (
      <GestureOverlay
        onScreenshotCaptured={handleScreenshotCapture}
        onClose={() => setActiveMode(null)}
      />
    );
  }

  if (activeMode === 'browser') {
    return (
      <div className="relative">
        <Button
          onClick={() => setActiveMode(null)}
          variant="ghost"
          className="absolute top-4 left-4 z-10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <AIBrowser />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Grab & Browse
          </h1>
          <p className="text-gray-400">
            Gesture screenshots + AI-powered search
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => setActiveMode('gesture')}
            className="group bg-gradient-to-br from-primary/20 to-purple-500/10 border border-primary/30 rounded-2xl p-8 hover:border-primary/50 transition-all hover:scale-105"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Hand className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-white font-semibold text-xl mb-2">Gesture Screenshot</h3>
            <p className="text-gray-400 text-sm">
              Capture screens with hand gestures
            </p>
            <div className="mt-4 text-xs text-gray-500">
              Open palm → Close fist
            </div>
          </button>

          <button
            onClick={() => setActiveMode('browser')}
            className="group bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-8 hover:border-blue-500/50 transition-all hover:scale-105"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <Globe className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold text-xl mb-2">AI Browser</h3>
            <p className="text-gray-400 text-sm">
              Search with AI summaries & citations
            </p>
            <div className="mt-4 text-xs text-gray-500">
              Powered by GPT-4
            </div>
          </button>
        </div>

        {/* Transfer UI */}
        {capturedFile && (
          <WebRTCTransfer
            file={capturedFile.blob}
            fileName={capturedFile.name}
            onClose={() => setCapturedFile(null)}
          />
        )}

        {/* Features List */}
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-primary/20">
          <h3 className="text-white font-semibold mb-4">Features</h3>
          <ul className="space-y-3 text-gray-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">✓</span>
              <span>Hand gesture recognition with MediaPipe</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">✓</span>
              <span>P2P file transfer with E2E encryption</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">✓</span>
              <span>Multi-source search aggregation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">✓</span>
              <span>AI summaries with citations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">✓</span>
              <span>Personalized recommendations</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
