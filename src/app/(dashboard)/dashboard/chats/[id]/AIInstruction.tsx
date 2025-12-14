"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Paper, Text, Textarea, Button, Group, Stack } from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
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
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <div>
          <Text size="lg" fw={600}>KI-Anweisung</Text>
          <Text size="sm" c="dimmed">
            Definiere, wie sich der Chatbot verhalten soll. Diese Anweisung wird bei jeder Antwort berücksichtigt.
          </Text>
        </div>

        {/* Template-Auswahl */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Vorlage wählen
          </Text>
          <Group gap="xs">
            {systemInstructionTemplates.map((template) => (
              <Button
                key={template.id}
                variant={selectedTemplate === template.id ? "filled" : "light"}
                color={selectedTemplate === template.id ? "blue" : "gray"}
                size="xs"
                onClick={() => applyTemplate(template.id)}
              >
                {template.name}
              </Button>
            ))}
          </Group>
        </div>

        {/* Textarea */}
        <Textarea
          value={systemInstruction}
          onChange={(e) => setSystemInstruction(e.target.value)}
          placeholder="z.B. Du bist ein freundlicher Assistent, der Fragen zu unseren Produkten beantwortet..."
          minRows={5}
          autosize
          styles={{ input: { fontFamily: "monospace" } }}
        />

        {/* Speichern-Button */}
        <Group justify="flex-end">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={isSaving}
            onClick={handleSave}
          >
            Speichern
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
