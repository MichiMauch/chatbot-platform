import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, MessageSquare, MoreVertical, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { chats, teamMembers, teams } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { DeleteChatButton } from "@/components/chat/DeleteChatButton";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deine Chats</h1>
          <p className="text-gray-500 mt-1">
            Verwalte deine RAG-Chatbots
          </p>
        </div>
        {limitReached ? (
          <Button disabled className="opacity-50 cursor-not-allowed">
            <Plus className="w-4 h-4 mr-2" />
            Limit erreicht
          </Button>
        ) : (
          <Link href="/dashboard/chats/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Neuer Chat
            </Button>
          </Link>
        )}
      </div>

      {/* Chat List */}
      {teamChats.length === 0 ? (
        <EmptyState limitReached={!!limitReached} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="divide-y divide-gray-200">
            {teamChats.map((chat) => (
              <ChatRow key={chat.id} chat={chat} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ limitReached }: { limitReached: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <MessageSquare className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Noch keine Chats
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        Erstelle deinen ersten RAG-Chatbot und beginne, Dokumente hochzuladen
        und mit deinen Daten zu chatten.
      </p>
      {limitReached ? (
        <Button disabled className="opacity-50 cursor-not-allowed">
          <Plus className="w-4 h-4 mr-2" />
          Limit erreicht
        </Button>
      ) : (
        <Link href="/dashboard/chats/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Ersten Chat erstellen
          </Button>
        </Link>
      )}
    </div>
  );
}

function ChatRow({
  chat,
}: {
  chat: {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    createdAt: Date;
  };
}) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MessageSquare className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{chat.displayName}</h3>
          <p className="text-sm text-gray-500">
            /c/{chat.name} •{" "}
            {chat.createdAt.toLocaleDateString("de-CH")}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Link
          href={`/c/${chat.name}`}
          target="_blank"
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          title="Chat öffnen"
        >
          <ExternalLink className="w-5 h-5" />
        </Link>
        <Link
          href={`/dashboard/chats/${chat.id}`}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          title="Einstellungen"
        >
          <MoreVertical className="w-5 h-5" />
        </Link>
        <DeleteChatButton chatId={chat.id} chatName={chat.displayName} />
      </div>
    </div>
  );
}
