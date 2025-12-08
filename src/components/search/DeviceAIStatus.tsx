import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cpu, Zap, Sparkles, Smartphone, Globe } from 'lucide-react';

interface DeviceAIStatusProps {
  supportsWebGPU: boolean;
  modelCached: boolean;
  gpuInfo?: string | null;
  processingTimeMs?: number;
}

export const DeviceAIStatus = ({ 
  supportsWebGPU, 
  modelCached, 
  gpuInfo,
  processingTimeMs 
}: DeviceAIStatusProps) => {
  const [deviceInfo, setDeviceInfo] = useState<{
    hasAppleIntelligence: boolean;
    hasGeminiNano: boolean;
    deviceName: string;
  }>({
    hasAppleIntelligence: false,
    hasGeminiNano: false,
    deviceName: 'Device'
  });

  useEffect(() => {
    detectDeviceAI();
  }, []);

  const detectDeviceAI = () => {
    const ua = navigator.userAgent;
    
    // Detect iOS device and version
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    let iosVersion = 0;
    if (isIOS) {
      const match = ua.match(/OS (\d+)_/);
      if (match) iosVersion = parseInt(match[1], 10);
    }

    // iPhone 16 Pro detection (approximate)
    const isIPhone16 = /iPhone1[6-9]/.test(ua) || (isIOS && iosVersion >= 18);
    
    // Android with Gemini Nano
    const isAndroid = /Android/.test(ua);
    const hasGemini = isAndroid && (/Pixel [89]/.test(ua) || /SM-S9[234]/.test(ua));

    // Determine device name
    let deviceName = 'Device';
    if (isIPhone16) deviceName = 'iPhone 16';
    else if (isIOS) deviceName = 'iPhone';
    else if (/Pixel/.test(ua)) deviceName = 'Pixel';
    else if (/Samsung/.test(ua)) deviceName = 'Samsung';
    else if (isAndroid) deviceName = 'Android';

    setDeviceInfo({
      hasAppleIntelligence: isIPhone16 && iosVersion >= 18,
      hasGeminiNano: hasGemini,
      deviceName
    });
  };

  const getSpeedLabel = () => {
    if (processingTimeMs === undefined) return null;
    if (processingTimeMs < 10) return 'Instant';
    if (processingTimeMs < 50) return 'Ultra Fast';
    if (processingTimeMs < 100) return 'Fast';
    return 'Quick';
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* WebGPU Status */}
        {supportsWebGPU && (
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 gap-1"
              >
                <Zap className="w-2.5 h-2.5" />
                GPU
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">WebGPU Acceleration Active</p>
              {gpuInfo && <p className="text-xs text-muted-foreground">{gpuInfo}</p>}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Apple Intelligence */}
        {deviceInfo.hasAppleIntelligence && (
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 h-5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 gap-1"
              >
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Apple Intelligence Ready</p>
              <p className="text-xs text-muted-foreground">Your {deviceInfo.deviceName} has on-device AI</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Gemini Nano */}
        {deviceInfo.hasGeminiNano && (
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 h-5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 gap-1"
              >
                <Cpu className="w-2.5 h-2.5" />
                Nano
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Gemini Nano Available</p>
              <p className="text-xs text-muted-foreground">On-device AI on your {deviceInfo.deviceName}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Model Cached */}
        {modelCached && (
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 h-5 bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 gap-1"
              >
                <Globe className="w-2.5 h-2.5" />
                Cached
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">AI Model Cached Locally</p>
              <p className="text-xs text-muted-foreground">Faster responses, works offline</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Processing Speed */}
        {processingTimeMs !== undefined && processingTimeMs < 100 && (
          <Badge 
            variant="secondary" 
            className="text-[10px] px-1.5 py-0 h-5 gap-1"
          >
            {getSpeedLabel()} • {processingTimeMs < 1 ? '<1' : Math.round(processingTimeMs)}ms
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
};

export default DeviceAIStatus;
