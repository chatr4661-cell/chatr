import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mic, Sparkles, Zap, Smartphone, Globe } from 'lucide-react';

interface SiriIntegrationProps {
  query: string;
  onVoiceSearch?: () => void;
}

interface DeviceCapabilities {
  isIOS: boolean;
  isIOS18Plus: boolean;
  hasAppleIntelligence: boolean;
  isAndroid: boolean;
  hasGeminiNano: boolean;
  hasSiri: boolean;
  supportsShortcuts: boolean;
}

export const SiriIntegration = ({ query, onVoiceSearch }: SiriIntegrationProps) => {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    isIOS: false,
    isIOS18Plus: false,
    hasAppleIntelligence: false,
    isAndroid: false,
    hasGeminiNano: false,
    hasSiri: false,
    supportsShortcuts: false
  });
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    detectCapabilities();
  }, []);

  const detectCapabilities = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    
    // Detect iOS version
    let iosVersion = 0;
    if (isIOS) {
      const match = ua.match(/OS (\d+)_/);
      if (match) {
        iosVersion = parseInt(match[1], 10);
      }
    }
    
    const isIOS18Plus = iosVersion >= 18;
    
    // Apple Intelligence is available on iPhone 15 Pro+ with iOS 18.1+
    // We can't definitively detect this, but we can make educated guesses
    const hasAppleIntelligence = isIOS18Plus && (
      /iPhone1[5-9]|iPhone2[0-9]/.test(ua) || // iPhone 15+ series
      iosVersion >= 18 // Assume newer devices
    );

    // Check for Android Gemini Nano (Pixel 8+, Samsung S24+)
    const hasGeminiNano = isAndroid && (
      /Pixel [89]/.test(ua) ||
      /SM-S9[234]/.test(ua) // Samsung S24 series
    );

    setCapabilities({
      isIOS,
      isIOS18Plus,
      hasAppleIntelligence,
      isAndroid,
      hasGeminiNano,
      hasSiri: isIOS,
      supportsShortcuts: isIOS && iosVersion >= 12
    });
  };

  const invokeSiri = () => {
    // Siri can't be invoked programmatically, but we can guide users
    setShowTip(true);
    
    // Try to use Siri Shortcuts URL scheme
    if (capabilities.supportsShortcuts && query) {
      // This opens Shortcuts app with a pre-filled search
      const shortcutURL = `shortcuts://run-shortcut?name=CHATR%20Search&input=${encodeURIComponent(query)}`;
      window.location.href = shortcutURL;
    }
  };

  const invokeGoogleAssistant = () => {
    // Open Google Assistant with query
    if (query) {
      window.location.href = `googleassistant://search?q=${encodeURIComponent(query)}`;
    } else {
      window.location.href = 'googleassistant://';
    }
  };

  // Don't show if no special capabilities
  if (!capabilities.hasAppleIntelligence && !capabilities.hasGeminiNano && !capabilities.hasSiri) {
    return null;
  }

  return (
    <div className="relative">
      {/* Device AI Badge */}
      {(capabilities.hasAppleIntelligence || capabilities.hasGeminiNano) && (
        <Badge 
          variant="outline" 
          className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 text-xs gap-1"
        >
          <Sparkles className="w-3 h-3 text-purple-500" />
          {capabilities.hasAppleIntelligence ? 'Apple Intelligence Ready' : 'Gemini Nano Ready'}
        </Badge>
      )}

      {/* Siri/Assistant Button */}
      <div className="flex gap-2 mt-2">
        {capabilities.hasSiri && (
          <Button
            variant="outline"
            size="sm"
            onClick={invokeSiri}
            className="gap-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
          >
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Mic className="w-2.5 h-2.5 text-white" />
            </div>
            Ask Siri
          </Button>
        )}

        {capabilities.isAndroid && (
          <Button
            variant="outline"
            size="sm"
            onClick={invokeGoogleAssistant}
            className="gap-2 bg-gradient-to-r from-blue-500/10 to-green-500/10 border-blue-500/30 hover:bg-blue-500/20"
          >
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 flex items-center justify-center">
              <Mic className="w-2.5 h-2.5 text-white" />
            </div>
            Ask Google
          </Button>
        )}

        {onVoiceSearch && (
          <Button
            variant="outline"
            size="sm"
            onClick={onVoiceSearch}
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            Voice Search
          </Button>
        )}
      </div>

      {/* Siri Tip Modal */}
      {showTip && capabilities.hasSiri && (
        <Card className="absolute top-full left-0 right-0 mt-2 p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20 z-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Say to Siri:</h4>
              <p className="text-sm text-muted-foreground mb-2">
                "Hey Siri, search {query || 'biryani near me'} on CHATR"
              </p>
              
              {capabilities.hasAppleIntelligence && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-xs">
                    Your iPhone 16 has Apple Intelligence - Siri uses ChatGPT for complex queries!
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Smartphone className="w-3 h-3" />
                <span>Add CHATR to Siri Shortcuts for faster access</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowTip(false)}
              className="text-muted-foreground"
            >
              ✕
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

// Siri Shortcut Configuration Component
export const SiriShortcutSetup = () => {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
  }, []);

  if (!isIOS) return null;

  const addToSiri = () => {
    // Open Shortcuts app to add CHATR
    window.location.href = 'shortcuts://create-shortcut';
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Add CHATR to Siri</h3>
          <p className="text-xs text-muted-foreground">Search faster with your voice</p>
        </div>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span>"Hey Siri, search on CHATR"</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Globe className="w-4 h-4 text-blue-500" />
          <span>"Hey Siri, find doctors on CHATR"</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span>"Hey Siri, CHATR food delivery"</span>
        </div>
      </div>

      <Button 
        onClick={addToSiri}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
      >
        <Mic className="w-4 h-4 mr-2" />
        Add to Siri Shortcuts
      </Button>
    </Card>
  );
};

export default SiriIntegration;
