import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VIDEO_EFFECTS } from "@/utils/videoEffects";

interface VideoEffectsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentEffect: string;
  onEffectChange: (effectId: string) => void;
}

export function VideoEffectsPanel({ 
  isOpen, 
  onClose, 
  currentEffect, 
  onEffectChange 
}: VideoEffectsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-24 left-4 right-4 bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-white/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-white" />
              <h3 className="text-white font-semibold">Video Effects</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {VIDEO_EFFECTS.map((effect) => (
              <Button
                key={effect.id}
                variant={currentEffect === effect.id ? "default" : "outline"}
                onClick={() => {
                  onEffectChange(effect.id);
                  onClose();
                }}
                className={cn(
                  "h-auto py-3 px-4 flex flex-col items-center gap-2",
                  currentEffect === effect.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white/5 text-white border-white/20 hover:bg-white/10"
                )}
              >
                <span className="text-sm font-medium">{effect.name}</span>
              </Button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
