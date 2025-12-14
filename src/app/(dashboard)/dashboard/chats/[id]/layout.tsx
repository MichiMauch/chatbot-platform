import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Stack } from "@mantine/core";
import { db } from "@/lib/db";
import { chats, teamMembers, teams } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ChatTabs } from "./ChatTabs";
import { SetPageTitle } from "@/components/SetPageTitle";
import { getPlan } from "@/lib/stripe";
import { SettingsSaveProvider } from "@/contexts/SettingsSaveContext";

interface ChatLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ChatLayout({ children, params }: ChatLayoutProps) {
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

  // Team laden für Plan-Check
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, chat.teamId),
  });

  const plan = getPlan(team?.plan || "free");
  const allowPublicChats = plan.limits.allowPublicChats;

  return (
    <>
      <SetPageTitle
        title={chat.displayName}
        chatData={{
          chatId: chat.id,
          chatSlug: chat.name,
          isPublic: chat.isPublic ?? true,
          allowPublicChats,
        }}
      />

      <SettingsSaveProvider>
        <Stack gap="md">
          {/* Tabs */}
          <ChatTabs chatId={id} />

          {/* Content */}
          {children}
        </Stack>
      </SettingsSaveProvider>
    </>
  );
}
