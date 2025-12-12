"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { systemInstructionTemplates } from "@/lib/systemInstructionTemplates";

interface AIInstructionProps {
  chatId: string;
  initialInstruction: string | null;
}

export function AIInstruction({ chatId, initialInstruction }: AIInstructionProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState(initialInstruction || "");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(() => {
    const match = systemInstructionTemplates.find(
      (t) => t.instruction === initialInstruction
    );
    return match?.id ?? null;
  });

  const applyTemplate = (templateId: string) => {
    const template = systemInstructionTemplates.find((t) => t.id === templateId);
    if (template) {
      setSystemInstruction(template.instruction);
      setSelectedTemplate(templateId);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Fehler beim Speichern");
        return;
      }

      toast.success("KI-Anweisung gespeichert");
      router.refresh();
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                selectedTemplate === template.id
                  ? "bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500"
                  : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
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

      {/* Speichern-Button */}
      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} isLoading={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Speichern
        </Button>
      </div>
    </section>
  );
}
