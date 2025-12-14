// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { chats, chatSessions, chatMessages, scrapedPages } from "@/lib/schema";
import { eq, count, sum, sql } from "drizzle-orm";
import {
  MessageSquare,
  Users,
  Calendar,
  ExternalLink,
  FileText,
  Globe,
  HardDrive,
  Zap,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import {
  calculateStorageFromFiles,
  getFileCount,
  formatBytes,
  formatTokens,
} from "@/lib/admin-stats";

interface ChatWithStats {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isPublic: boolean | null;
  files: string | null;
  createdAt: Date | null;
  team: { id: string; name: string } | null;
  sessionCount: number;
  messageCount: number;
  scrapedPagesCount: number;
  totalTokens: number;
}

async function getChats(): Promise<ChatWithStats[]> {
  const allChats = await db.query.chats.findMany({
    orderBy: (chats, { desc }) => [desc(chats.createdAt)],
    with: {
      team: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Get stats for each chat
  const chatsWithStats = await Promise.all(
    allChats.map(async (chat) => {
      // Session count
      const [sessionCount] = await db
        .select({ count: count() })
        .from(chatSessions)
        .where(eq(chatSessions.chatId, chat.id));

      // Message count and tokens
      const sessions = await db.query.chatSessions.findMany({
        where: eq(chatSessions.chatId, chat.id),
        columns: { id: true },
      });

      let messageCount = 0;
      let totalTokens = 0;

      if (sessions.length > 0) {
        for (const session of sessions) {
          const [msgStats] = await db
            .select({
              count: count(),
              inputTokens: sum(chatMessages.tokenCountInput),
              outputTokens: sum(chatMessages.tokenCountOutput),
            })
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, session.id));

          messageCount += msgStats.count;
          totalTokens +=
            (Number(msgStats.inputTokens) || 0) +
            (Number(msgStats.outputTokens) || 0);
        }
      }

      // Scraped pages count
      const [scrapedCount] = await db
        .select({ count: count() })
        .from(scrapedPages)
        .where(eq(scrapedPages.chatId, chat.id));

      return {
        id: chat.id,
        name: chat.name,
        displayName: chat.displayName,
        description: chat.description,
        isPublic: chat.isPublic,
        files: chat.files,
        createdAt: chat.createdAt,
        team: chat.team,
        sessionCount: sessionCount.count,
        messageCount,
        scrapedPagesCount: scrapedCount.count,
        totalTokens,
      };
    })
  );

  return chatsWithStats;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default async function AdminChatsPage() {
  const allChats = await getChats();

  // Calculate totals for summary cards
  const totalChats = allChats.length;
  const totalFiles = allChats.reduce(
    (sum, chat) => sum + getFileCount(chat.files),
    0
  );
  const totalStorage = allChats.reduce(
    (sum, chat) => sum + calculateStorageFromFiles(chat.files),
    0
  );
  const totalMessages = allChats.reduce(
    (sum, chat) => sum + chat.messageCount,
    0
  );
  const totalTokens = allChats.reduce((sum, chat) => sum + chat.totalTokens, 0);
  const totalScrapedPages = allChats.reduce(
    (sum, chat) => sum + chat.scrapedPagesCount,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
        <p className="text-gray-600 mt-1">
          Alle Chats der Plattform mit Usage-Statistiken
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Chats"
          value={totalChats}
          icon={MessageSquare}
          color="blue"
        />
        <StatCard
          title="Dokumente"
          value={totalFiles}
          icon={FileText}
          color="green"
        />
        <StatCard
          title="Scraped Pages"
          value={totalScrapedPages}
          icon={Globe}
          color="purple"
        />
        <StatCard
          title="Speicher"
          value={formatBytes(totalStorage)}
          icon={HardDrive}
          color="orange"
        />
        <StatCard
          title="Nachrichten"
          value={totalMessages.toLocaleString("de-CH")}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Tokens"
          value={formatTokens(totalTokens)}
          icon={Zap}
          color="green"
        />
      </div>

      {/* Chats Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chat
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Msgs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scraped
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allChats.map((chat) => {
                const fileCount = getFileCount(chat.files);
                const storage = calculateStorageFromFiles(chat.files);

                return (
                  <tr key={chat.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/chats/${chat.id}`}
                        className="block hover:text-blue-600"
                      >
                        <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {chat.displayName}
                        </div>
                        <div className="text-sm text-gray-500">
                          /c/{chat.name}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {chat.team?.name || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Users className="w-4 h-4 mr-1 text-gray-400" />
                        {chat.sessionCount}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MessageSquare className="w-4 h-4 mr-1 text-gray-400" />
                        {chat.messageCount}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <FileText className="w-4 h-4 mr-1 text-gray-400" />
                        {fileCount}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Globe className="w-4 h-4 mr-1 text-gray-400" />
                        {chat.scrapedPagesCount}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <HardDrive className="w-4 h-4 mr-1 text-gray-400" />
                        {formatBytes(storage)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Zap className="w-4 h-4 mr-1 text-gray-400" />
                        {formatTokens(chat.totalTokens)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {chat.isPublic ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Öffentlich
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Privat
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {chat.createdAt
                          ? new Date(chat.createdAt).toLocaleDateString("de-CH")
                          : "-"}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/chats/${chat.id}`}
                          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600"
                          title="Details"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/c/${chat.name}`}
                          target="_blank"
                          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600"
                          title="Chat öffnen"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {allChats.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Keine Chats gefunden
          </div>
        )}
      </div>
    </div>
  );
}
