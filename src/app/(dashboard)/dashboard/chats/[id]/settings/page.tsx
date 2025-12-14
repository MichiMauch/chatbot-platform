// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { chats, teamMembers, teams } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { AppearanceSettings } from "./AppearanceSettings";
import { getPlan } from "@/lib/stripe";

interface ChatSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatSettingsPage({ params }: ChatSettingsPageProps) {
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

  // Load team to check plan
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, chat.teamId),
  });

  const plan = getPlan(team?.plan || "free");
  const allowPublicChats = plan.limits.allowPublicChats;
  const allowEmbed = plan.limits.allowEmbed;

  return (
    <AppearanceSettings chat={chat} allowPublicChats={allowPublicChats} allowEmbed={allowEmbed} />
  );
}
