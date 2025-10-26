import { useEffect, useRef } from 'react';

interface DetectedObject {
  type: string;
  confidence: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  brand?: {
    brand_id: string;
    brand_name: string;
    placement_id: string;
    replacement_asset_url: string;
    replacement_type: string;
  };
}

interface VideoOverlayRendererProps {
  detectedObjects: DetectedObject[];
  videoRef: React.RefObject<HTMLVideoElement>;
  onInteraction?: (brandId: string, placementId: string, objectType: string) => void;
}

export default function VideoOverlayRenderer({ 
  detectedObjects, 
  videoRef,
  onInteraction 
}: VideoOverlayRendererProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoRef.current || !overlayRef.current) return;

    const video = videoRef.current;
    const overlay = overlayRef.current;

    const updateOverlaySize = () => {
      overlay.style.width = `${video.offsetWidth}px`;
      overlay.style.height = `${video.offsetHeight}px`;
    };

    updateOverlaySize();
    window.addEventListener('resize', updateOverlaySize);

    return () => window.removeEventListener('resize', updateOverlaySize);
  }, [videoRef]);

  return (
    <div
      ref={overlayRef}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {detectedObjects.map((obj, idx) => {
        if (!obj.brand) return null;

        return (
          <div
            key={`${obj.type}-${idx}`}
            className="absolute pointer-events-auto cursor-pointer transition-all hover:scale-105"
            style={{
              left: `${obj.position.x}%`,
              top: `${obj.position.y}%`,
              width: `${obj.size.width}%`,
              height: `${obj.size.height}%`,
            }}
            onClick={() => onInteraction?.(
              obj.brand!.brand_id,
              obj.brand!.placement_id,
              obj.type
            )}
          >
            {obj.brand.replacement_type === 'overlay' && (
              <img
                src={obj.brand.replacement_asset_url}
                alt={obj.brand.brand_name}
                className="w-full h-full object-contain opacity-90 hover:opacity-100"
                style={{
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                  mixBlendMode: 'multiply'
                }}
              />
            )}
            
            {obj.brand.replacement_type === 'ar_filter' && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="bg-gradient-to-br from-purple-500/80 to-pink-500/80 backdrop-blur-sm rounded-lg p-2 text-white text-xs font-bold shadow-lg">
                  {obj.brand.brand_name}
                </div>
              </div>
            )}

            {/* Small brand indicator */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
              {obj.brand.brand_name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
