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

    setDisplayedText("");
    setIsComplete(false);

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedText((prev) => {
          const newText =
            currentIndex === 0
              ? words[currentIndex]
              : prev + " " + words[currentIndex];
          return newText;
        });
        currentIndex++;
      } else {
        setIsComplete(true);
        onCompleteRef.current?.();
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayedText, isComplete, skip };
}
