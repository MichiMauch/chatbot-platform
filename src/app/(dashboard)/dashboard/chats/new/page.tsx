"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Paper,
  TextInput,
  Textarea,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Anchor,
} from "@mantine/core";
import { IconArrowLeft, IconMessageCircle } from "@tabler/icons-react";
import { toast } from "sonner";

export default function NewChatPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-generiere URL-freundlichen Namen
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!name || name === slugify(displayName)) {
      setName(slugify(value));
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" })[c] || c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayName, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fehler beim Erstellen");
        return;
      }

      toast.success(`Chat "${displayName}" wurde erstellt`);
      router.push(`/dashboard/chats/${data.id}`);
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack gap="md" maw={672} mx="auto">
      {/* Back Link */}
      <Anchor component={Link} href="/dashboard/chats" c="dimmed" underline="never">
        <Group gap="xs">
          <IconArrowLeft size={16} />
          Zurück zu Chats
        </Group>
      </Anchor>

      {/* Form Card */}
      <Paper p="lg" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <Group>
            <ThemeIcon size="xl" variant="light">
              <IconMessageCircle size={24} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="lg">Neuen Chat erstellen</Text>
              <Text size="sm" c="dimmed">Erstelle einen neuen RAG-Chatbot</Text>
            </div>
          </Group>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Name"
                placeholder="Mein Chatbot"
                value={displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                required
              />

              <TextInput
                label="URL-Name"
                leftSection={<Text size="sm" c="dimmed">/c/</Text>}
                leftSectionWidth={40}
                value={name}
                onChange={(e) => setName(slugify(e.target.value))}
                placeholder="mein-chatbot"
                required
                description="Dieser Name wird in der URL verwendet und kann nicht geändert werden."
              />

              <Textarea
                label="Beschreibung (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibe, wofür dieser Chatbot verwendet wird..."
                rows={3}
              />

              <Group justify="flex-end">
                <Button variant="outline" component={Link} href="/dashboard/chats">
                  Abbrechen
                </Button>
                <Button type="submit" loading={isLoading}>
                  Chat erstellen
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Stack>
  );
}
