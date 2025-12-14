import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { chats, teamMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { AnalyticsContent } from "./AnalyticsContent";

interface ChatAnalyticsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatAnalyticsPage({ params }: ChatAnalyticsPageProps) {
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

  return (
    <AnalyticsContent chatId={chat.id} />
  );
}
