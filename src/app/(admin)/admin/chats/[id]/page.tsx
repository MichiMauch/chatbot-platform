import { db } from "@/lib/db";
import { chats, chatSessions, chatMessages, scrapedPages } from "@/lib/schema";
import { eq, count, sum, avg, desc } from "drizzle-orm";
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Calendar,
  ExternalLink,
  FileText,
  Globe,
  HardDrive,
  Zap,
  Clock,
  AlertTriangle,
  DollarSign,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  parseFilesJson,
  formatBytes,
  formatTokens,
  formatResponseTime,
  formatCost,
  formatRelativeTime,
  calculateErrorRate,
} from "@/lib/admin-stats";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getChatDetails(chatId: string) {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      team: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!chat) return null;

  // Get all sessions
  const sessions = await db.query.chatSessions.findMany({
    where: eq(chatSessions.chatId, chatId),
    orderBy: (chatSessions, { desc }) => [desc(chatSessions.lastActivityAt)],
  });

  // Calculate message stats across all sessions
  let totalMessages = 0;
  let totalUserMessages = 0;
  let totalBotMessages = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalResponseTime = 0;
  let responseTimeCount = 0;
  let errorCount = 0;
  let lastActivityAt: Date | null = null;

  for (const session of sessions) {
    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.sessionId, session.id),
    });

    for (const msg of messages) {
      totalMessages++;
      if (msg.role === "user") totalUserMessages++;
      if (msg.role === "assistant") totalBotMessages++;
      totalInputTokens += msg.tokenCountInput || 0;
      totalOutputTokens += msg.tokenCountOutput || 0;
      if (msg.responseTimeMs) {
        totalResponseTime += msg.responseTimeMs;
        responseTimeCount++;
      }
      if (msg.hadError) errorCount++;
    }

    if (
      session.lastActivityAt &&
      (!lastActivityAt || session.lastActivityAt > lastActivityAt)
    ) {
      lastActivityAt = session.lastActivityAt;
    }
  }

  const avgResponseTime =
    responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : null;

  // Get scraped pages
  const scrapedPagesList = await db.query.scrapedPages.findMany({
    where: eq(scrapedPages.chatId, chatId),
    orderBy: (scrapedPages, { desc }) => [desc(scrapedPages.lastScrapedAt)],
  });

  // Parse files
  const files = parseFilesJson(chat.files);
  const totalStorage = files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

  return {
    chat,
    stats: {
      sessionCount: sessions.length,
      totalMessages,
      totalUserMessages,
      totalBotMessages,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      avgResponseTime,
      errorCount,
      errorRate: calculateErrorRate(totalBotMessages, errorCount),
      lastActivityAt,
    },
    files,
    totalStorage,
    scrapedPages: scrapedPagesList,
    recentSessions: sessions.slice(0, 20),
  };
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "purple" | "orange" | "red" | "gray";
  subtitle?: string;
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
    gray: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export default async function AdminChatDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getChatDetails(id);

  if (!data) {
    notFound();
  }

  const { chat, stats, files, totalStorage, scrapedPages, recentSessions } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/chats"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Zurück zu Chats
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{chat.displayName}</h1>
          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
            <span>/c/{chat.name}</span>
            {chat.team && <span>Team: {chat.team.name}</span>}
            <span>
              Erstellt:{" "}
              {chat.createdAt
                ? new Date(chat.createdAt).toLocaleDateString("de-CH")
                : "-"}
            </span>
            {chat.isPublic ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Öffentlich
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Privat
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/c/${chat.name}`}
          target="_blank"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Chat öffnen
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          title="Sessions"
          value={stats.sessionCount}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Nachrichten"
          value={stats.totalMessages}
          icon={MessageSquare}
          color="green"
          subtitle={`${stats.totalUserMessages} User / ${stats.totalBotMessages} Bot`}
        />
        <StatCard
          title="Avg. Response"
          value={formatResponseTime(stats.avgResponseTime)}
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Error Rate"
          value={stats.errorRate}
          icon={AlertTriangle}
          color={stats.errorCount > 0 ? "red" : "green"}
          subtitle={`${stats.errorCount} Fehler`}
        />
        <StatCard
          title="Dokumente"
          value={files.length}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Scraped Pages"
          value={scrapedPages.length}
          icon={Globe}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          title="Speicher"
          value={formatBytes(totalStorage)}
          icon={HardDrive}
          color="orange"
        />
        <StatCard
          title="Total Tokens"
          value={formatTokens(stats.totalTokens)}
          icon={Zap}
          color="green"
        />
        <StatCard
          title="Input Tokens"
          value={formatTokens(stats.totalInputTokens)}
          icon={Zap}
          color="blue"
        />
        <StatCard
          title="Output Tokens"
          value={formatTokens(stats.totalOutputTokens)}
          icon={Zap}
          color="purple"
        />
        <StatCard
          title="Est. Kosten"
          value={formatCost(
            Math.round(
              (stats.totalInputTokens * 0.00015 + stats.totalOutputTokens * 0.0006) *
                100
            )
          )}
          icon={DollarSign}
          color="orange"
          subtitle="Gemini Flash Preise"
        />
        <StatCard
          title="Letzte Aktivität"
          value={formatRelativeTime(stats.lastActivityAt)}
          icon={Activity}
          color="gray"
        />
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Dokumente ({files.length})
          </h2>
        </div>
        {files.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Keine Dokumente hochgeladen
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dateiname
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Typ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Größe
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hochgeladen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {files.map((file, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {file.displayName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {file.mimeType}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatBytes(file.sizeBytes || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {file.uploadedAt
                        ? new Date(file.uploadedAt).toLocaleDateString("de-CH")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scraped Pages */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Scraped Pages ({scrapedPages.length})
          </h2>
        </div>
        {scrapedPages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Keine Seiten gescrapt
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Titel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Letztes Scraping
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {scrapedPages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {page.title || page.displayName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate block max-w-md"
                      >
                        {page.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {page.lastScrapedAt
                        ? new Date(page.lastScrapedAt).toLocaleDateString("de-CH")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Sessions (letzte 20)
          </h2>
        </div>
        {recentSessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Keine Sessions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Visitor ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nachrichten
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User / Bot
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Erstellt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Letzte Aktivität
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {session.visitorId?.slice(0, 12) || "-"}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {session.totalMessages || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {session.totalUserMessages || 0} / {session.totalBotMessages || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {session.createdAt
                        ? new Date(session.createdAt).toLocaleDateString("de-CH")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatRelativeTime(session.lastActivityAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
