import { motion, AnimatePresence } from "framer-motion";
import { Video, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallStateTransitionProps {
  state: "dialing" | "ringing" | "connecting" | "connected";
  contactName: string;
  callType: "video" | "voice";
}

export function CallStateTransition({ state, contactName, callType }: CallStateTransitionProps) {
  const messages = {
    dialing: "Calling...",
    ringing: "Ringing...",
    connecting: "Connecting...",
    connected: ""
  };

  const icons = {
    video: Video,
    voice: Phone
  };

  const Icon = icons[callType];

  return (
    <AnimatePresence mode="wait">
      {state !== "connected" && (
        <motion.div
          key={state}
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-blue-900/20 via-black/40 to-purple-900/20"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-center space-y-6"
          >
            {/* Animated Icon */}
            <motion.div
              className="relative mx-auto"
              animate={{
                scale: state === "ringing" ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center backdrop-blur-sm bg-white/5">
                <Icon className="w-12 h-12 text-white" />
              </div>
              
              {/* Pulsing rings */}
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-white/40"
                animate={{
                  scale: [1, 1.5, 1.5],
                  opacity: [0.6, 0, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-white/40"
                animate={{
                  scale: [1, 1.5, 1.5],
                  opacity: [0.6, 0, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.5
                }}
              />
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-white text-2xl font-semibold">{contactName}</p>
              <motion.p
                className="text-white/80 text-lg mt-2"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {messages[state]}
              </motion.p>
            </motion.div>

            {/* Connection progress indicator */}
            {state === "connecting" && (
              <motion.div
                className="w-64 h-1 bg-white/20 rounded-full overflow-hidden mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
