"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number; // ms per word
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  displayedText: string;
  isComplete: boolean;
  skip: () => void;
}

export function useTypewriter({
  text,
  speed = 50,
  onComplete,
}: UseTypewriterOptions): UseTypewriterReturn {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  // Store callback in ref to avoid dependency issues
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const skip = useCallback(() => {
    setDisplayedText(text);
    setIsComplete(true);
    onCompleteRef.current?.();
  }, [text]);

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      setIsComplete(false);
      return;
    }

    // Split text into words
    const words = text.split(" ");
    let currentIndex = 0;
    let isActive = true; // Guard against stale callbacks (React Strict Mode)

    setDisplayedText("");
    setIsComplete(false);

    const interval = setInterval(() => {
      // Skip if effect was cleaned up
      if (!isActive) return;

      if (currentIndex < words.length) {
        const word = words[currentIndex];
        // Extra guard: only add if word is defined
        if (word !== undefined) {
          setDisplayedText((prev) => {
            return currentIndex === 0 ? word : prev + " " + word;
          });
        }
        currentIndex++;
      } else {
        setIsComplete(true);
        onCompleteRef.current?.();
        clearInterval(interval);
      }
    }, speed);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [text, speed]);

  return { displayedText, isComplete, skip };
}
