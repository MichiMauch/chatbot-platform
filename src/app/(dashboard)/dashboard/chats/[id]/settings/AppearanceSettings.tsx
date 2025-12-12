"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, TrendingUp, Plus, X, MessageCircleQuestion, MessageSquare, Bot, Users, Calendar, Mail } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { themeColors, type ThemeColor } from "@/lib/systemInstructionTemplates";
import { chatLogos, type ChatLogoId } from "@/lib/chatLogos";

// Dynamic import for LottieLoader to avoid SSR issues
const LottieLoader = dynamic(() => import("@/components/LottieLoader"), { ssr: false });

interface Chat {
  id: string;
  displayName: string;
  description: string | null;
  themeColor: string | null;
  isPublic: boolean | null;
  allowAnonymous: boolean | null;
  starterQuestions: string | null;
  welcomeMessage: string | null;
  chatLogo: string | null;
  leadCaptureEnabled: boolean | null;
  leadCaptureTrigger: string | null;
  calendarLink: string | null;
  newsletterEnabled: boolean | null;
  newsletterTrigger: string | null;
}

interface AppearanceSettingsProps {
  chat: Chat;
  allowPublicChats?: boolean;
}

export function AppearanceSettings({ chat, allowPublicChats = true }: AppearanceSettingsProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [displayName, setDisplayName] = useState(chat.displayName);
  const [description, setDescription] = useState(chat.description || "");
  const [themeColor, setThemeColor] = useState<ThemeColor>(
    (chat.themeColor as ThemeColor) || "blue"
  );
  const [isPublic, setIsPublic] = useState(chat.isPublic ?? true);
  const [allowAnonymous, setAllowAnonymous] = useState(chat.allowAnonymous ?? true);
  const [starterQuestions, setStarterQuestions] = useState<string[]>(() => {
    if (!chat.starterQuestions) return [];
    try {
      const parsed = JSON.parse(chat.starterQuestions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [welcomeMessage, setWelcomeMessage] = useState(chat.welcomeMessage || "");
  const [chatLogo, setChatLogo] = useState<ChatLogoId>(
    (chat.chatLogo as ChatLogoId) || "default"
  );
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(chat.leadCaptureEnabled ?? false);
  const [leadCaptureTrigger, setLeadCaptureTrigger] = useState(chat.leadCaptureTrigger || "5");
  const [calendarLink, setCalendarLink] = useState(chat.calendarLink || "");
  const [newsletterEnabled, setNewsletterEnabled] = useState(chat.newsletterEnabled ?? false);
  const [newsletterTrigger, setNewsletterTrigger] = useState(chat.newsletterTrigger || "5");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          description,
          themeColor,
          isPublic,
          allowAnonymous,
          starterQuestions: starterQuestions.filter(q => q.trim()).length > 0
            ? JSON.stringify(starterQuestions.filter(q => q.trim()))
            : null,
          welcomeMessage: welcomeMessage.trim() || null,
          chatLogo,
          leadCaptureEnabled,
          leadCaptureTrigger: leadCaptureEnabled ? leadCaptureTrigger : null,
          calendarLink: calendarLink.trim() || null,
          newsletterEnabled,
          newsletterTrigger: newsletterEnabled ? newsletterTrigger : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Fehler beim Speichern");
        return;
      }

      toast.success("Einstellungen gespeichert");
      router.refresh();
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setIsSaving(false);
    }
  };

  const addStarterQuestion = () => {
    if (starterQuestions.length < 4) {
      setStarterQuestions([...starterQuestions, ""]);
    }
  };

  const updateStarterQuestion = (index: number, value: string) => {
    const updated = [...starterQuestions];
    updated[index] = value;
    setStarterQuestions(updated);
  };

  const removeStarterQuestion = (index: number) => {
    setStarterQuestions(starterQuestions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      {/* Basis-Einstellungen */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Allgemein
        </h2>
        <div className="space-y-4">
          <Input
            label="Anzeigename"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Mein Chatbot"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibe, wofür dieser Chatbot verwendet wird..."
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Farbthema */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Farbthema
        </h2>
        <div className="flex gap-3">
          {themeColors.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setThemeColor(theme.id)}
              className={`relative w-12 h-12 rounded-full transition-transform hover:scale-110 ${
                themeColor === theme.id ? "ring-2 ring-offset-2 ring-gray-400" : ""
              }`}
              style={{ backgroundColor: theme.color }}
              title={theme.name}
            >
              {themeColor === theme.id && (
                <Check className="absolute inset-0 m-auto w-6 h-6 text-white" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Chat-Logo */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Chat-Logo
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Wähle ein animiertes Logo für deinen Chatbot.
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {chatLogos.map((logo) => (
            <button
              key={logo.id}
              onClick={() => setChatLogo(logo.id)}
              className={`relative aspect-square rounded-xl border-2 transition-all hover:scale-105 flex items-center justify-center bg-gray-50 ${
                chatLogo === logo.id
                  ? "border-blue-500 ring-2 ring-blue-500"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              title={logo.name}
            >
              {logo.path ? (
                <div className="w-12 h-12">
                  <LottieLoader
                    path={logo.path}
                    loop
                    autoplay
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              ) : (
                <Bot className="w-8 h-8 text-gray-400" />
              )}
              {chatLogo === logo.id && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Startfragen */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MessageCircleQuestion className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">
            Startfragen
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Diese Fragen werden angezeigt, wenn der Chat geöffnet wird. Benutzer können darauf klicken, um schnell loszulegen.
        </p>

        <div className="space-y-3">
          {starterQuestions.map((question, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => updateStarterQuestion(index, e.target.value)}
                placeholder={`Frage ${index + 1}, z.B. "Was sind eure Öffnungszeiten?"`}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeStarterQuestion(index)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {starterQuestions.length < 4 && (
          <button
            type="button"
            onClick={addStarterQuestion}
            className="mt-3 inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Frage hinzufügen
          </button>
        )}

        {starterQuestions.length >= 4 && (
          <p className="mt-3 text-sm text-gray-500">
            Maximal 4 Startfragen möglich
          </p>
        )}
      </section>

      {/* Begrüssungsnachricht */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">
            Begrüssungsnachricht
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Diese Nachricht wird als erste Bot-Nachricht angezeigt, wenn der Chat geöffnet wird.
        </p>
        <textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          placeholder="z.B. Hallo! Ich bin dein persönlicher Assistent. Wie kann ich dir heute helfen?"
          rows={3}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </section>

      {/* Lead-Generierung */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">
            Lead-Generierung
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Sammle Kontaktdaten von interessierten Besuchern.
        </p>

        <div className="space-y-6">
          {/* Lead Capture Toggle */}
          <label className="flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-900">Kontaktformular</span>
              <p className="text-sm text-gray-500">
                Zeige ein Kontaktformular nach einigen Nachrichten
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLeadCaptureEnabled(!leadCaptureEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                leadCaptureEnabled ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  leadCaptureEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          {/* Contact Form Trigger */}
          {leadCaptureEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wann soll das Kontaktformular erscheinen?
              </label>
              <select
                value={leadCaptureTrigger}
                onChange={(e) => setLeadCaptureTrigger(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="2">Nach 2 Antworten</option>
                <option value="5">Nach 5 Antworten</option>
                <option value="10">Nach 10 Antworten</option>
                <option value="exit">Beim Verlassen der Seite</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Das Formular erscheint als Chat-Nachricht im Verlauf
              </p>
            </div>
          )}

          {/* Calendar Link */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <label className="block text-sm font-medium text-gray-700">
                Kalender-Link (optional)
              </label>
            </div>
            <input
              type="url"
              value={calendarLink}
              onChange={(e) => setCalendarLink(e.target.value)}
              placeholder="https://calendar.app.google/..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Zeigt einen &quot;Termin buchen&quot; Button im Chat
            </p>
          </div>

          {/* Newsletter Toggle */}
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <span className="font-medium text-gray-900">Newsletter</span>
                <p className="text-sm text-gray-500">
                  Email-Anmeldung im Chat anbieten
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewsletterEnabled(!newsletterEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                newsletterEnabled ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  newsletterEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          {/* Newsletter Trigger */}
          {newsletterEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wann soll das Newsletter-Formular erscheinen?
              </label>
              <select
                value={newsletterTrigger}
                onChange={(e) => setNewsletterTrigger(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="2">Nach 2 Antworten</option>
                <option value="5">Nach 5 Antworten</option>
                <option value="10">Nach 10 Antworten</option>
                <option value="exit">Beim Verlassen der Seite</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Das Formular erscheint als Chat-Nachricht im Verlauf
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Zugriff */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Zugriff
        </h2>

        {/* Free plan hint */}
        {!allowPublicChats && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">
                  Öffentliche Chats sind im Free Plan nicht verfügbar
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Upgrade deinen Plan, um Chats öffentlich zugänglich zu machen.
                </p>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center text-sm text-amber-800 font-medium mt-2 hover:underline"
                >
                  Jetzt upgraden
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <label className={`flex items-center justify-between ${!allowPublicChats ? "opacity-50" : ""}`}>
            <div>
              <span className="font-medium text-gray-900">Öffentlich</span>
              <p className="text-sm text-gray-500">
                Chat ist über die öffentliche URL erreichbar
              </p>
            </div>
            <button
              type="button"
              onClick={() => allowPublicChats && setIsPublic(!isPublic)}
              disabled={!allowPublicChats}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublic ? "bg-blue-600" : "bg-gray-200"
              } ${!allowPublicChats ? "cursor-not-allowed" : ""}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          <label className={`flex items-center justify-between ${!allowPublicChats ? "opacity-50" : ""}`}>
            <div>
              <span className="font-medium text-gray-900">Anonyme Nutzer</span>
              <p className="text-sm text-gray-500">
                Nutzer können ohne Anmeldung chatten
              </p>
            </div>
            <button
              type="button"
              onClick={() => allowPublicChats && setAllowAnonymous(!allowAnonymous)}
              disabled={!allowPublicChats}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                allowAnonymous ? "bg-blue-600" : "bg-gray-200"
              } ${!allowPublicChats ? "cursor-not-allowed" : ""}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  allowAnonymous ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>
      </section>

      {/* Speichern-Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Einstellungen speichern
        </Button>
      </div>
    </div>
  );
}
