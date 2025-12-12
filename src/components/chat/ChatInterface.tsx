"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { nanoid } from "nanoid";
import { useTypewriter } from "@/hooks/useTypewriter";
import MessageWithCitations, { Citation } from "./MessageWithCitations";
import TypingIndicator from "./TypingIndicator";
import DocumentPreviewModal from "./DocumentPreviewModal";
import { Source } from "./CitationMarker";

interface FileMetadata {
  documentName: string;
  displayName: string;
  localPath: string;
  mimeType: string;
}

interface ScrapedPageData {
  title: string | null;
  displayName: string | null;
  fileSearchDocumentName: string | null;
  url: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  citations?: Citation[];
  sources?: Source[];
  isNew?: boolean; // For typewriter effect on new messages
}

interface Chat {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  themeColor: string;
  fileSearchStoreName: string | null;
  systemInstruction: string | null;
  isPublic: boolean;
  files?: string; // JSON string of FileMetadata[]
  scrapedPages?: ScrapedPageData[];
  starterQuestions?: string[];
}

interface ChatInterfaceProps {
  chat: Chat;
}

// Get visitor ID from localStorage
function getVisitorId(): string {
  if (typeof window === "undefined") return nanoid();

  let visitorId = localStorage.getItem("visitor_id");
  if (!visitorId) {
    visitorId = nanoid();
    localStorage.setItem("visitor_id", visitorId);
  }
  return visitorId;
}

// Theme colors
const themeColors: Record<string, { primary: string; light: string }> = {
  blue: { primary: "#3b82f6", light: "#eff6ff" },
  green: { primary: "#22c55e", light: "#f0fdf4" },
  purple: { primary: "#a855f7", light: "#faf5ff" },
  orange: { primary: "#f97316", light: "#fff7ed" },
  red: { primary: "#ef4444", light: "#fef2f2" },
};

// TypedMessage component for bot messages with animation
function TypedMessage({
  content,
  citations,
  sources,
  onComplete,
  onDocumentClick,
}: {
  content: string;
  citations?: Citation[];
  sources?: Source[];
  onComplete?: () => void;
  onDocumentClick?: (source: Source) => void;
}) {
  const { displayedText, isComplete, skip } = useTypewriter({
    text: content,
    speed: 30, // 30ms per word
    onComplete,
  });

  // Only show citations after animation is complete
  const displayCitations = isComplete ? citations : undefined;

  return (
    <div
      className="cursor-pointer"
      onClick={skip}
      title={isComplete ? "" : "Klicken um vollständigen Text anzuzeigen"}
    >
      <MessageWithCitations
        content={displayedText}
        citations={displayCitations}
        sources={isComplete ? sources : undefined}
        onDocumentClick={onDocumentClick}
      />
      {!isComplete && (
        <span
          className="inline-block w-1 h-4 ml-1 animate-pulse bg-gray-400"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default function ChatInterface({ chat }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewSource, setPreviewSource] = useState<Source | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const theme = themeColors[chat.themeColor] || themeColors.blue;

  // Parse file metadata from chat
  const fileMetadata: FileMetadata[] = chat.files
    ? JSON.parse(chat.files)
    : [];

  // Scraped pages data
  const scrapedPages: ScrapedPageData[] = chat.scrapedPages || [];

  // Scroll to last user message
  const scrollToLastUserMessage = (userMessageIndex: number) => {
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const element = container.querySelector(
        `[data-message-index="${userMessageIndex}"]`
      ) as HTMLElement;
      if (!element) return;

      // Explicit geometry calculation for reliable scrolling in flex layouts
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollDistance = elementRect.top - containerRect.top + container.scrollTop - 24;

      container.scrollTo({
        top: scrollDistance,
        behavior: "smooth",
      });
    });
  };

  // Scroll when user sends a new message
  useEffect(() => {
    const lastUserIndex = messages.reduce((lastIdx, msg, idx) => {
      return msg.role === "user" ? idx : lastIdx;
    }, -1);

    const lastMessage = messages[messages.length - 1];

    if (lastMessage?.role === "user" && lastUserIndex >= 0) {
      scrollToLastUserMessage(lastUserIndex);
    }
  }, [messages]);

  // Load messages from sessionStorage (cleared when browser closes)
  useEffect(() => {
    const storageKey = `chat-messages-${chat.id}`;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        // Mark all loaded messages as not new (no animation)
        const loadedMessages = JSON.parse(stored).map((msg: Message) => ({
          ...msg,
          isNew: false,
        }));
        setMessages(loadedMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    }
  }, [chat.id]);

  // Save messages to sessionStorage (cleared when browser closes)
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `chat-messages-${chat.id}`;
      // Don't save isNew flag
      const messagesToSave = messages.map(({ isNew, ...msg }) => msg);
      sessionStorage.setItem(storageKey, JSON.stringify(messagesToSave));
    }
  }, [messages, chat.id]);

  // Map usedFileUris to Sources
  function mapFileUrisToSources(usedFileUris: string[]): Source[] {
    const sources: Source[] = [];

    for (const uri of usedFileUris) {
      // Extract filename from URI (format: "stores/.../files/filename")
      const filename = uri.includes("/files/")
        ? uri.split("/files/").pop()
        : uri.split("/").pop();

      // 1. First check file metadata (uploaded documents)
      const file = fileMetadata.find((f) => {
        return (
          f.documentName.includes(filename || "") ||
          f.displayName === filename
        );
      });

      if (file) {
        sources.push({
          displayName: file.displayName,
          localPath: file.localPath,
          mimeType: file.mimeType,
        });
        continue;
      }

      // 2. Then check scraped pages (website sources)
      const scrapedPage = scrapedPages.find((p) => {
        return (
          p.fileSearchDocumentName?.includes(filename || "") ||
          p.displayName === filename
        );
      });

      if (scrapedPage) {
        sources.push({
          displayName: scrapedPage.title || scrapedPage.displayName || filename || "Webseite",
          url: scrapedPage.url,
        });
        continue;
      }

      // 3. Fallback: use filename from URI
      sources.push({
        displayName: filename || "Unbekanntes Dokument",
      });
    }

    return sources;
  }

  // Handle document click - open preview modal
  function handleDocumentClick(source: Source) {
    if (source.localPath) {
      setPreviewSource(source);
      setIsPreviewOpen(true);
    }
  }

  // Close preview modal
  function handleClosePreview() {
    setIsPreviewOpen(false);
    setPreviewSource(null);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: nanoid(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          chatId: chat.id,
          visitorId: getVisitorId(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler bei der Anfrage");
      }

      // Map file URIs to sources
      const sources = data.usedFileUris
        ? mapFileUrisToSources(data.usedFileUris)
        : undefined;

      const assistantMessage: Message = {
        id: nanoid(),
        role: "assistant",
        content: data.response,
        messageId: data.messageId,
        citations: data.citations,
        sources,
        isNew: true, // Trigger typewriter animation
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: nanoid(),
        role: "assistant",
        content: `Fehler: ${(error as Error).message}`,
        isNew: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Mark message as no longer new after animation completes
  function handleAnimationComplete(messageId: string) {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isNew: false } : msg
      )
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="text-white p-4 sm:p-6 flex-shrink-0"
        style={{
          background: `linear-gradient(to right, ${theme.primary}, ${theme.primary}dd)`,
        }}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold">{chat.displayName}</h1>
          {chat.description && (
            <p className="text-sm opacity-90 mt-1">{chat.description}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6"
        style={{ scrollBehavior: "auto" }}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot
                className="w-12 h-12 mx-auto mb-4"
                style={{ color: theme.primary }}
              />
              <p className="text-lg font-medium text-gray-900">Willkommen!</p>
              <p className="text-sm text-gray-500 mt-2">
                Stelle eine Frage, um zu beginnen.
              </p>

              {/* Starter Questions */}
              {chat.starterQuestions && chat.starterQuestions.length > 0 && (
                <div className="mt-6 space-y-2 max-w-md mx-auto">
                  {chat.starterQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInput(question);
                        // Auto-submit the question
                        setTimeout(() => {
                          const form = document.querySelector("form");
                          if (form) form.requestSubmit();
                        }, 100);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div
              key={message.id}
              data-message-index={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex space-x-3 max-w-[85%] ${
                  message.role === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor:
                      message.role === "user" ? theme.primary : theme.light,
                    color: message.role === "user" ? "white" : theme.primary,
                  }}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={{
                    backgroundColor:
                      message.role === "user" ? theme.primary : "white",
                    color: message.role === "user" ? "white" : "#1f2937",
                    boxShadow:
                      message.role === "assistant"
                        ? "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
                        : "none",
                  }}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap text-sm sm:text-base">
                      {message.content}
                    </p>
                  ) : message.isNew ? (
                    <TypedMessage
                      content={message.content}
                      citations={message.citations}
                      sources={message.sources}
                      onComplete={() => handleAnimationComplete(message.id)}
                      onDocumentClick={handleDocumentClick}
                    />
                  ) : (
                    <MessageWithCitations
                      content={message.content}
                      citations={message.citations}
                      sources={message.sources}
                      onDocumentClick={handleDocumentClick}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex space-x-3">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: theme.light,
                    color: theme.primary,
                  }}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white shadow-sm">
                  <TypingIndicator themeColor={theme.primary} />
                </div>
              </div>
            </div>
          )}

          {/* Spacer for scroll room */}
          {messages.length > 0 && (
            <div className="min-h-[60vh]" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex space-x-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Stelle eine Frage..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              style={{
                // @ts-expect-error CSS variable for focus ring
                "--tw-ring-color": theme.primary,
              }}
              rows={2}
              disabled={loading}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="text-white w-12 h-12 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center hover:opacity-90"
              style={{
                backgroundColor: theme.primary,
              }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-2 text-center">
            Enter zum Senden, Shift+Enter für neue Zeile
          </p>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        source={previewSource}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
      />
    </div>
  );
}
