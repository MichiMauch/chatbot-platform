"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOADING_MESSAGES = [
  "Denke nach...",
  "Suche in Dokumenten...",
  "Formuliere Antwort...",
  "Fast fertig...",
];

interface TypingIndicatorProps {
  themeColor?: string;
}

export default function TypingIndicator({ themeColor = "#3b82f6" }: TypingIndicatorProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-3">
      {/* Animated Dots */}
      <div className="flex space-x-1">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            animate={{
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.15,
              ease: "easeInOut",
            }}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: themeColor }}
          />
        ))}
      </div>

      {/* Rotating Loading Messages */}
      <AnimatePresence mode="wait">
        <motion.span
          key={messageIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-gray-600"
        >
          {LOADING_MESSAGES[messageIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
