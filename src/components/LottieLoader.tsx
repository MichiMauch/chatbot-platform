"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

interface LottieLoaderProps {
  path: string;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function LottieLoader({
  path,
  loop = true,
  autoplay = true,
  style,
  className,
}: LottieLoaderProps) {
  const [animationData, setAnimationData] = useState<unknown>(null);

  useEffect(() => {
    fetch(path)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error("Failed to load Lottie animation:", err));
  }, [path]);

  if (!animationData) {
    return null;
  }

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      style={style}
      className={className}
    />
  );
}
