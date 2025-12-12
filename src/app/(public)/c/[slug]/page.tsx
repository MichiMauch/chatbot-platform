"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
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
}

export default function PublicChatPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChat() {
      try {
        const response = await fetch(`/api/chats/by-slug/${slug}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Chat nicht gefunden.");
          } else {
            setError("Fehler beim Laden des Chats.");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setChat(data.chat);
        setLoading(false);
      } catch (err) {
        console.error("Error loading chat:", err);
        setError("Fehler beim Laden des Chats.");
        setLoading(false);
      }
    }

    loadChat();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Chat wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Chat nicht gefunden
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "Diese Chat-Instanz existiert nicht oder wurde gelöscht."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ChatInterface chat={chat} />
    </div>
  );
}
