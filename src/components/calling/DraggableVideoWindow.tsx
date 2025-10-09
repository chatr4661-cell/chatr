import React, { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { VideoOff } from "lucide-react";

interface DraggableVideoWindowProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  enabled: boolean;
  className?: string;
}

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "bottom-center";

const CORNERS: Record<Corner, { x: number; y: number }> = {
  "top-left": { x: 16, y: 16 },
  "top-right": { x: -16, y: 16 },
  "bottom-left": { x: 16, y: -16 },
  "bottom-right": { x: -16, y: -16 },
  "bottom-center": { x: 0, y: -16 },
};

const SNAP_THRESHOLD = 80;

export function DraggableVideoWindow({ 
  videoRef, 
  stream, 
  enabled,
  className 
}: DraggableVideoWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [currentCorner, setCurrentCorner] = useState<Corner>("bottom-right");

  // Load saved position from localStorage
  useEffect(() => {
    const savedCorner = localStorage.getItem("pip-corner") as Corner;
    if (savedCorner && CORNERS[savedCorner]) {
      setCurrentCorner(savedCorner);
      positionAtCorner(savedCorner);
    } else {
      positionAtCorner("bottom-right");
    }
  }, []);

  const positionAtCorner = (corner: Corner) => {
    if (!containerRef.current) return;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const elementWidth = containerRef.current.offsetWidth;
    const elementHeight = containerRef.current.offsetHeight;

    let targetX = CORNERS[corner].x;
    let targetY = CORNERS[corner].y;

    // Calculate actual positions based on corner
    if (corner.includes("right")) {
      targetX = windowWidth - elementWidth + targetX;
    }
    if (corner.includes("bottom")) {
      targetY = windowHeight - elementHeight + targetY;
    }
    if (corner === "bottom-center") {
      targetX = (windowWidth - elementWidth) / 2;
      targetY = windowHeight - elementHeight + targetY;
    }

    x.set(targetX);
    y.set(targetY);
  };

  const findNearestCorner = (currentX: number, currentY: number): Corner => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const elementWidth = containerRef.current?.offsetWidth || 0;
    const elementHeight = containerRef.current?.offsetHeight || 0;

    const centerX = currentX + elementWidth / 2;
    const centerY = currentY + elementHeight / 2;

    const isLeft = centerX < windowWidth / 3;
    const isRight = centerX > (2 * windowWidth) / 3;
    const isTop = centerY < windowHeight / 2;
    const isBottom = centerY > windowHeight / 2;
    const isCenter = !isLeft && !isRight;

    if (isBottom && isCenter) return "bottom-center";
    if (isTop && isLeft) return "top-left";
    if (isTop && isRight) return "top-right";
    if (isBottom && isLeft) return "bottom-left";
    if (isBottom && isRight) return "bottom-right";

    // Default to bottom-right
    return "bottom-right";
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const currentX = x.get();
    const currentY = y.get();
    
    const nearestCorner = findNearestCorner(currentX, currentY);
    setCurrentCorner(nearestCorner);
    localStorage.setItem("pip-corner", nearestCorner);
    
    positionAtCorner(nearestCorner);
  };

  return (
    <motion.div
      ref={containerRef}
      drag
      dragElastic={0.1}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      style={{ x, y }}
      className={cn(
        "absolute z-30 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-move touch-none",
        "w-32 h-40 transition-shadow hover:shadow-xl",
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform scale-x-[-1]"
      />
      {!enabled && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <VideoOff className="h-8 w-8 text-white/70" />
        </div>
      )}
      
      {/* Drag indicator */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/40 rounded-full" />
    </motion.div>
  );
}
