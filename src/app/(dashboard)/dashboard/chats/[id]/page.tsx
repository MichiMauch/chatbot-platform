import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { chats, teamMembers, teams } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { CopyUrlButton } from "./CopyUrlButton";
import { ChatSettings } from "./ChatSettings";
import { DocumentUpload } from "./DocumentUpload";
import { WebsiteScraper } from "./WebsiteScraper";
import { ContentSourceToggle } from "./ContentSourceToggle";
import { getPlan } from "@/lib/stripe";

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

  // Load team to check plan
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, chat.teamId),
  });

  const plan = getPlan(team?.plan || "free");
  const allowPublicChats = plan.limits.allowPublicChats;

  const publicUrl = `/c/${chat.name}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/chats"
        className="inline-flex items-center text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zu Chats
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {chat.displayName}
              </h1>
              {chat.description && (
                <p className="text-gray-500 mt-1">{chat.description}</p>
              )}
            </div>
          </div>
          <Link href={publicUrl} target="_blank">
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Chat öffnen
            </Button>
          </Link>
        </div>
      </div>

      {/* Public URL */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Öffentliche URL
        </h2>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-700">
            {publicUrl}
          </code>
          <CopyUrlButton url={publicUrl} />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Teile diese URL, damit andere mit deinem Chatbot chatten können.
        </p>
      </div>

      {/* Content Source (Documents or Website) */}
      <ContentSourceToggle
        chatId={chat.id}
        initialUploadType={chat.uploadType || "documents"}
        initialFiles={chat.files ? JSON.parse(chat.files) : []}
        sitemapUrls={chat.sitemapUrls ? JSON.parse(chat.sitemapUrls) : []}
      />

      {/* Settings */}
      <ChatSettings chat={chat} allowPublicChats={allowPublicChats} />

      {/* Info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Erstellt am:</span>
            <span className="ml-2 text-gray-900">
              {chat.createdAt.toLocaleDateString("de-CH")}
            </span>
          </div>
          <div>
            <span className="text-gray-500">URL-Name:</span>
            <span className="ml-2 text-gray-900 font-mono">{chat.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
