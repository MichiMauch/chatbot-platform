"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MessageCircle, X } from "lucide-react";
import { chatLogos } from "@/lib/chatLogos";

// Dynamic import for LottieLoader to avoid SSR issues
const LottieLoader = dynamic(() => import("@/components/LottieLoader"), { ssr: false });

interface WidgetPreviewProps {
  chatId: string;
  themeColor?: string;
  bubbleText?: string;
  chatLogo?: string;
}

const themeColors: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#a855f7",
  orange: "#f97316",
  red: "#ef4444",
  cyan: "#4FD1D3",
};

export function WidgetPreview({ chatId, themeColor = "blue", bubbleText, chatLogo }: WidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const primaryColor = themeColors[themeColor] || themeColors.blue;

  // Get the logo path from chatLogos
  const logoPath = chatLogo && chatLogo !== "default"
    ? chatLogos.find(l => l.id === chatLogo)?.path
    : null;

  // Check sessionStorage on mount to see if bubble was dismissed
  useEffect(() => {
    if (bubbleText) {
      const bubbleDismissed = sessionStorage.getItem(`widget-bubble-dismissed-${chatId}`);
      if (!bubbleDismissed) {
        setShowBubble(true);
      }
    }
  }, [bubbleText, chatId]);

  const handleOpenChat = () => {
    setIsOpen(true);
    setShowBubble(false);
    // Store in sessionStorage that bubble was dismissed
    sessionStorage.setItem(`widget-bubble-dismissed-${chatId}`, "true");
  };

  const dismissBubble = () => {
    setShowBubble(false);
    sessionStorage.setItem(`widget-bubble-dismissed-${chatId}`, "true");
  };

  return (
    <>
      {/* Speech Bubble */}
      {showBubble && bubbleText && !isOpen && (
        <div
          className="fixed bottom-7 right-24 max-w-xs bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50"
          style={{
            animation: "fadeIn 0.3s ease",
          }}
        >
          <button
            onClick={dismissBubble}
            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500"
            aria-label="Schliessen"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-sm text-gray-700 pr-2">{bubbleText}</p>
          {/* Speech bubble pointer */}
          <div
            className="absolute top-1/2 -right-2 w-0 h-0 -translate-y-1/2"
            style={{
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderLeft: "8px solid white",
            }}
          />
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => (isOpen ? setIsOpen(false) : handleOpenChat())}
        className="fixed bottom-5 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 transition-transform hover:scale-105 overflow-hidden"
        style={{ backgroundColor: isOpen || !logoPath ? primaryColor : "white" }}
        aria-label={isOpen ? "Chat schliessen" : "Chat öffnen"}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : logoPath ? (
          <div className="w-10 h-10">
            <LottieLoader
              path={logoPath}
              loop
              autoplay
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Popup */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-5 w-[380px] h-[600px] max-h-[calc(100vh-140px)] bg-white rounded-2xl shadow-2xl overflow-hidden z-40 border border-gray-200"
          style={{
            animation: "slideIn 0.3s ease",
          }}
        >
          <div className="absolute top-0 left-0 right-0 bg-gray-100 px-4 py-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Widget-Vorschau
            </p>
          </div>
          <iframe
            src={`/embed/${chatId}?widget=true`}
            className="w-full h-full pt-8"
            title="Chat Widget Vorschau"
          />
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
