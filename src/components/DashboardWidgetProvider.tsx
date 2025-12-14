"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WidgetPreview } from "./WidgetPreview";

interface ChatWithWidget {
  id: string;
  themeColor: string | null;
  widgetBubbleText: string | null;
  chatLogo: string | null;
}

export function DashboardWidgetProvider() {
  const [chat, setChat] = useState<ChatWithWidget | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    async function loadWidgetChat() {
      try {
        const response = await fetch("/api/chats/widget-preview");
        if (response.ok) {
          const data = await response.json();
          setChat(data.chat); // Immer setzen, auch wenn null
        }
      } catch (error) {
        console.error("Error loading widget chat:", error);
        setChat(null);
      }
    }

    loadWidgetChat();
  }, [pathname]); // Bei Seitenwechsel neu laden

  if (!chat) {
    return null;
  }

  return (
    <WidgetPreview
      chatId={chat.id}
      themeColor={chat.themeColor || "blue"}
      bubbleText={chat.widgetBubbleText || undefined}
      chatLogo={chat.chatLogo || undefined}
    />
  );
}
