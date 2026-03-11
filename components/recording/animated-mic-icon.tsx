"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { RecordingState } from "./recording-state";

interface AnimatedMicIconProps {
  size?: number;
  state: RecordingState;
  onClick?: () => void;
}

export function AnimatedMicIcon({
  size = 24,
  state,
  onClick,
}: AnimatedMicIconProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getColor = (state: RecordingState) => {
    switch (state) {
      case RecordingState.Recording:
        return "#ef4444"; // red
      case RecordingState.waitingForRecording:
        return "#eab308"; // yellow
      case RecordingState.notStarted:
        return "var(--foreground)"; // theme-aware
      case RecordingState.Paused:
        return "#d97706"; // dark-yellow
      default:
        return "var(--foreground)"; // theme-aware
    }
  };

  const getBackgroundColor = (state: RecordingState) => {
    switch (state) {
      case RecordingState.Recording:
        return "rgba(239, 68, 68, 0.2)"; // light red
      case RecordingState.waitingForRecording:
        return "rgba(234, 179, 8, 0.2)"; // light yellow
      default:
        return "transparent";
    }
  };

  return (
    <motion.div
      className="relative cursor-pointer"
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={true}
        animate={{
          scale:
            state === RecordingState.Recording
              ? [1, 1.2, 1]
              : state === RecordingState.waitingForRecording
              ? [1, 1.6, 1]
              : 1,
          backgroundColor: getBackgroundColor(state),
        }}
        transition={{
          duration: state === RecordingState.Recording ? 1 : 1.5,
          repeat:
            state !== RecordingState.notStarted ? Number.POSITIVE_INFINITY : 0,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="relative z-10"
        animate={{
          scale: isHovered ? 1.1 : 1,
          color: getColor(state),
        }}
        transition={{ duration: 0.2 }}
      >
        <Mic size={size} />
      </motion.div>
    </motion.div>
  );
}
