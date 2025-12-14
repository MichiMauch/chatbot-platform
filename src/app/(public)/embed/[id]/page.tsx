"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import ChatInterface from "@/components/chat/ChatInterface";

interface Chat {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  themeColor: string;
  fileSearchStoreName: string | null;
  systemInstruction: string | null;
  isPublic: boolean;
  files?: string;
  starterQuestions?: string[];
  welcomeMessage?: string | null;
  chatLogo?: string | null;
  leadCaptureEnabled?: boolean;
  leadCaptureTrigger?: string | null;
  calendarLink?: string | null;
  newsletterEnabled?: boolean;
  newsletterTrigger?: string | null;
}

export default function EmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isWidget = searchParams.get("widget") === "true";

  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBranding, setShowBranding] = useState(true);

  useEffect(() => {
    async function loadChat() {
      try {
        const mode = isWidget ? "widget" : "embed";
        const response = await fetch(`/api/embed/${id}?mode=${mode}`);

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Fehler beim Laden des Chats.");
          setLoading(false);
          return;
        }

        const data = await response.json();
        setChat(data.chat);
        setShowBranding(data.showPlatformBranding);
        setLoading(false);
      } catch (err) {
        console.error("Error loading embed chat:", err);
        setError("Fehler beim Laden des Chats.");
        setLoading(false);
      }
    }

    loadChat();
  }, [id, isWidget]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="max-w-sm mx-auto text-center p-6">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">
            {error || "Chat nicht verfügbar."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex-1 overflow-hidden">
        <ChatInterface chat={chat} isEmbed={true} />
      </div>

      {showBranding && (
        <div className="flex-shrink-0 text-center py-2 px-4 bg-gray-50 border-t border-gray-200">
          <a
            href="https://chatlabs.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Powered by ChatLabs
          </a>
        </div>
      )}
    </div>
  );
}
