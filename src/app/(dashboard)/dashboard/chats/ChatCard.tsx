"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Paper, Menu, ActionIcon, Text, Group } from "@mantine/core";
import { IconDotsVertical, IconFileText, IconSettings, IconChartBar, IconTrash, IconExternalLink } from "@tabler/icons-react";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { chatLogos } from "@/lib/chatLogos";

const LottieLoader = dynamic(() => import("@/components/LottieLoader"), { ssr: false });

interface ChatCardProps {
  chat: {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    createdAt: Date;
    chatLogo: string | null;
  };
}

export function ChatCard({ chat }: ChatCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  // Get logo path from chatLogos
  const logoPath = chat.chatLogo && chat.chatLogo !== "default"
    ? chatLogos.find(l => l.id === chat.chatLogo)?.path
    : null;

  // Format creation date
  const formattedDate = new Date(chat.createdAt).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const handleDelete = async () => {
    if (!confirm(`Möchtest du "${chat.displayName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Fehler beim Löschen");
        return;
      }

      toast.success("Chat gelöscht");
      router.refresh();
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Paper p="md" withBorder className="hover:shadow-md transition-shadow">
      {/* Header with Logo and Menu */}
      <Group justify="space-between" mb="sm">
        <div className="p-2 bg-cyan-100 rounded-lg">
          {logoPath ? (
            <div style={{ width: 24, height: 24 }}>
              <LottieLoader path={logoPath} loop autoplay style={{ width: "100%", height: "100%" }} />
            </div>
          ) : (
            <Bot className="w-6 h-6 text-cyan-600" />
          )}
        </div>

        <Group gap="xs">
          {/* External Link */}
          <ActionIcon
            variant="subtle"
            color="gray"
            component="a"
            href={`/c/${chat.name}`}
            target="_blank"
          >
            <IconExternalLink size={18} />
          </ActionIcon>

          <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" disabled={isDeleting}>
              <IconDotsVertical size={18} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconFileText size={16} />}
              component={Link}
              href={`/dashboard/chats/${chat.id}`}
            >
              Inhalte
            </Menu.Item>
            <Menu.Item
              leftSection={<IconSettings size={16} />}
              component={Link}
              href={`/dashboard/chats/${chat.id}/settings`}
            >
              Einstellungen
            </Menu.Item>
            <Menu.Item
              leftSection={<IconChartBar size={16} />}
              component={Link}
              href={`/dashboard/chats/${chat.id}/analytics`}
            >
              Statistiken
            </Menu.Item>

            <Menu.Divider />

            <Menu.Item
              leftSection={<IconTrash size={16} />}
              color="red"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Löschen..." : "Löschen"}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        </Group>
      </Group>

      {/* Chat Info */}
      <Link href={`/dashboard/chats/${chat.id}`} className="block group">
        <Text fw={600} className="group-hover:text-cyan-600 transition-colors truncate">
          {chat.displayName}
        </Text>
        <Text size="sm" c="dimmed" mt={4}>
          /c/{chat.name}
        </Text>
        <Text size="xs" c="dimmed" mt={2}>
          Erstellt am {formattedDate}
        </Text>
      </Link>
    </Paper>
  );
}
