// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SimpleGrid, Paper, Text, Stack, Button } from "@mantine/core";
import { IconPlus, IconMessageCircle } from "@tabler/icons-react";
import { db } from "@/lib/db";
import { chats, teamMembers, teams } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ChatCard } from "./ChatCard";
import { SetPageTitle } from "@/components/SetPageTitle";

export default async function ChatsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Team-ID des Users holen
  let teamId = session.user.teamId;
  if (!teamId) {
    const membership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, session.user.id),
    });
    teamId = membership?.teamId;
  }

  // Team-Daten laden
  const team = teamId
    ? await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
      })
    : null;

  // Chats des Teams laden
  const teamChats = teamId
    ? await db.query.chats.findMany({
        where: eq(chats.teamId, teamId),
        orderBy: (chats, { desc }) => [desc(chats.createdAt)],
      })
    : [];

  // Check if chat limit is reached
  const limitReached = team && team.maxChats !== -1 && teamChats.length >= (team.maxChats ?? 1);

  return (
    <>
      <SetPageTitle
        title="Chats"
        subtitle="Verwalte deine RAG-Chatbots"
        headerAction={
          limitReached
            ? { icon: "plus", href: "/dashboard/chats/new", tooltip: "Limit erreicht", disabled: true }
            : { icon: "plus", href: "/dashboard/chats/new", tooltip: "Neuer Chat" }
        }
      />

      <Stack gap="md">
        {/* Chat Grid */}
        {teamChats.length === 0 ? (
          <EmptyState limitReached={!!limitReached} />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {teamChats.map((chat) => (
              <ChatCard key={chat.id} chat={chat} />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </>
  );
}

function EmptyState({ limitReached }: { limitReached: boolean }) {
  return (
    <Paper p="xl" withBorder className="text-center">
      <Stack align="center" gap="md">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
          <IconMessageCircle size={32} className="text-gray-400" />
        </div>
        <div>
          <Text fw={500} size="lg">Noch keine Chats</Text>
          <Text c="dimmed" size="sm" maw={300} mx="auto" mt="xs">
            Erstelle deinen ersten RAG-Chatbot und beginne, Dokumente hochzuladen
            und mit deinen Daten zu chatten.
          </Text>
        </div>
        {limitReached ? (
          <Button disabled leftSection={<IconPlus size={16} />}>
            Limit erreicht
          </Button>
        ) : (
          <Link href="/dashboard/chats/new">
            <Button leftSection={<IconPlus size={16} />}>
              Ersten Chat erstellen
            </Button>
          </Link>
        )}
      </Stack>
    </Paper>
  );
}
