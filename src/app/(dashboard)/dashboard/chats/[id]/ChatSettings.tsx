"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  systemInstructionTemplates,
  themeColors,
  type ThemeColor,
} from "@/lib/systemInstructionTemplates";

interface Chat {
  id: string;
  displayName: string;
  description: string | null;
  themeColor: string | null;
  systemInstruction: string | null;
  isPublic: boolean | null;
  allowAnonymous: boolean | null;
}

interface ChatSettingsProps {
  chat: Chat;
  allowPublicChats?: boolean;
}

export function ChatSettings({ chat, allowPublicChats = true }: ChatSettingsProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [displayName, setDisplayName] = useState(chat.displayName);
  const [description, setDescription] = useState(chat.description || "");
  const [themeColor, setThemeColor] = useState<ThemeColor>(
    (chat.themeColor as ThemeColor) || "blue"
  );
  const [systemInstruction, setSystemInstruction] = useState(
    chat.systemInstruction || ""
  );
  const [isPublic, setIsPublic] = useState(chat.isPublic ?? true);
  const [allowAnonymous, setAllowAnonymous] = useState(
    chat.allowAnonymous ?? true
  );

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
          systemInstruction,
          isPublic,
          allowAnonymous,
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

  const applyTemplate = (templateId: string) => {
    const template = systemInstructionTemplates.find((t) => t.id === templateId);
    if (template) {
      setSystemInstruction(template.instruction);
    }
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

      {/* KI-Anweisung */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          KI-Anweisung
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Definiere, wie sich der Chatbot verhalten soll. Diese Anweisung wird bei jeder Antwort berücksichtigt.
        </p>

        {/* Template-Auswahl */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vorlage wählen
          </label>
          <div className="flex flex-wrap gap-2">
            {systemInstructionTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template.id)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={systemInstruction}
          onChange={(e) => setSystemInstruction(e.target.value)}
          placeholder="z.B. Du bist ein freundlicher Assistent, der Fragen zu unseren Produkten beantwortet..."
          rows={5}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
        />
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
