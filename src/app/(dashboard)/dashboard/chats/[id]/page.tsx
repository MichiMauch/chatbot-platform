// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { chats, teamMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Paper, Stack, Text, Code, Group, SimpleGrid } from "@mantine/core";
import { CopyUrlButton } from "./CopyUrlButton";
import { ContentSourceToggle } from "./ContentSourceToggle";
import { AIInstruction } from "./AIInstruction";

interface ChatDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatDetailPage({ params }: ChatDetailPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Chat laden
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, id),
  });

  if (!chat) {
    notFound();
  }

  // Team-Zugehörigkeit prüfen
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, session.user.id),
  });

  if (!membership || membership.teamId !== chat.teamId) {
    notFound();
  }

  const publicUrl = `/c/${chat.name}`;

  return (
    <Stack gap="md">
      {/* Public URL */}
      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="sm">
          Öffentliche URL
        </Text>
        <Group gap="sm">
          <Code
            block
            style={{ flex: 1, padding: "12px 16px", fontSize: "14px" }}
          >
            {publicUrl}
          </Code>
          <CopyUrlButton url={publicUrl} />
        </Group>
        <Text size="sm" c="dimmed" mt="xs">
          Teile diese URL, damit andere mit deinem Chatbot chatten können.
        </Text>
      </Paper>

      {/* Content Source (Documents or Website) */}
      <ContentSourceToggle
        chatId={chat.id}
        initialUploadType={chat.uploadType || "documents"}
        initialFiles={chat.files ? JSON.parse(chat.files) : []}
        sitemapUrls={chat.sitemapUrls ? JSON.parse(chat.sitemapUrls) : []}
      />

      {/* AI Instruction */}
      <AIInstruction
        chatId={chat.id}
        initialInstruction={chat.systemInstruction}
      />

      {/* Info */}
      <Paper p="md" withBorder bg="gray.0">
        <SimpleGrid cols={2}>
          <div>
            <Text size="sm" c="dimmed">Erstellt am:</Text>
            <Text size="sm" fw={500}>
              {chat.createdAt.toLocaleDateString("de-CH")}
            </Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">URL-Name:</Text>
            <Text size="sm" fw={500} ff="monospace">{chat.name}</Text>
          </div>
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
