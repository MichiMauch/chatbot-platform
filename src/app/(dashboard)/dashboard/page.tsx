import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  MessageSquare,
  Users,
  Plus,
  ExternalLink,
  MoreVertical,
  TrendingUp,
  HardDrive,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { chats, teamMembers, teams, chatSessions, chatMessages } from "@/lib/schema";
import { eq, count, and, gte } from "drizzle-orm";
import { calculateStorageFromFiles } from "@/lib/admin-stats";

async function getDashboardData(userId: string) {
  // Get team membership
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, userId),
  });

  if (!membership) {
    return null;
  }

  // Get team with limits
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, membership.teamId),
  });

  if (!team) {
    return null;
  }

  // Get team chats
  const teamChats = await db.query.chats.findMany({
    where: eq(chats.teamId, team.id),
    orderBy: (chats, { desc }) => [desc(chats.createdAt)],
    limit: 5,
  });

  // Count all chats
  const [chatCount] = await db
    .select({ count: count() })
    .from(chats)
    .where(eq(chats.teamId, team.id));

  // Count team members
  const [memberCount] = await db
    .select({ count: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team.id));

  // Calculate storage in MB
  const allTeamChats = await db.query.chats.findMany({
    where: eq(chats.teamId, team.id),
  });
  const totalStorageBytes = allTeamChats.reduce(
    (sum, chat) => sum + calculateStorageFromFiles(chat.files),
    0
  );
  const totalStorageMb = Math.round((totalStorageBytes / (1024 * 1024)) * 10) / 10;

  // Count messages this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let messageCount = 0;
  for (const chat of allTeamChats) {
    const sessions = await db.query.chatSessions.findMany({
      where: eq(chatSessions.chatId, chat.id),
    });

    for (const session of sessions) {
      const [msgCount] = await db
        .select({ count: count() })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.sessionId, session.id),
            eq(chatMessages.role, "user"),
            gte(chatMessages.createdAt, startOfMonth)
          )
        );
      messageCount += msgCount.count;
    }
  }

  return {
    team,
    teamChats,
    stats: {
      totalChats: chatCount.count,
      teamMembers: memberCount.count,
    },
    usage: {
      chats: {
        used: chatCount.count,
        limit: team.maxChats ?? 1,
      },
      messages: {
        used: messageCount,
        limit: team.maxMessagesPerMonth ?? 100,
      },
      storage: {
        used: totalStorageMb,
        limit: team.maxStorageMb ?? 50,
      },
    },
  };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getDashboardData(session.user.id);

  const teamChats = data?.teamChats || [];
  const stats = data?.stats || { totalChats: 0, teamMembers: 1 };
  const usage = data?.usage || {
    chats: { used: 0, limit: 1 },
    messages: { used: 0, limit: 100 },
    storage: { used: 0, limit: 50 },
  };
  const currentPlan = data?.team?.plan || "free";

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Willkommen, {session.user.name || "Benutzer"}!
        </h1>
        <p className="text-gray-500 mt-1">
          Hier ist eine Übersicht deiner Chatbots und Nutzung.
        </p>
      </div>

      {/* Usage Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Deine Nutzung</h2>
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
            {currentPlan} Plan
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UsageBar
            label="Chatbots"
            used={usage.chats.used}
            limit={usage.chats.limit}
            icon={MessageSquare}
          />
          <UsageBar
            label="Nachrichten / Monat"
            used={usage.messages.used}
            limit={usage.messages.limit}
            icon={MessageSquare}
          />
          <UsageBar
            label="Speicher"
            used={usage.storage.used}
            limit={usage.storage.limit}
            unit="MB"
            icon={HardDrive}
          />
        </div>
        {currentPlan === "free" && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Für mehr Kapazität upgraden
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Aktive Chats"
          value={`${stats.totalChats} / ${usage.chats.limit === -1 ? "∞" : usage.chats.limit}`}
          icon={MessageSquare}
          color="blue"
        />
        <StatCard
          title="Nachrichten (Monat)"
          value={`${usage.messages.used} / ${usage.messages.limit === -1 ? "∞" : usage.messages.limit}`}
          icon={MessageSquare}
          color="green"
        />
        <StatCard
          title="Team-Mitglieder"
          value={stats.teamMembers}
          icon={Users}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Schnellzugriff
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="Neuen Chat erstellen"
            description="Erstelle einen neuen RAG-Chatbot"
            href="/dashboard/chats/new"
            icon={Plus}
            disabled={usage.chats.used >= usage.chats.limit && usage.chats.limit !== -1}
          />
          <QuickActionCard
            title="Team verwalten"
            description="Lade Mitglieder ein"
            href="/dashboard/team"
            icon={Users}
          />
          <QuickActionCard
            title="Abo verwalten"
            description="Plan und Rechnungen"
            href="/dashboard/billing"
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Recent Chats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Deine Chats</h2>
          <Link
            href="/dashboard/chats"
            className="text-sm text-blue-600 hover:underline"
          >
            Alle anzeigen
          </Link>
        </div>
        {teamChats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Du hast noch keine Chats erstellt.</p>
            <Link
              href="/dashboard/chats/new"
              className="inline-flex items-center mt-3 text-blue-600 hover:underline"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ersten Chat erstellen
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {teamChats.map((chat) => (
              <div key={chat.id} className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{chat.displayName}</h3>
                    <p className="text-xs text-gray-500">/c/{chat.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/c/${chat.name}`}
                    target="_blank"
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Chat öffnen"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/dashboard/chats/${chat.id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Einstellungen"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
  unit,
  icon: Icon,
}: {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const percentage = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  const isUnlimited = limit === -1;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <div className="flex items-center text-gray-600">
          <Icon className="w-4 h-4 mr-2 text-gray-400" />
          {label}
        </div>
        <span className="text-gray-900 font-medium">
          {typeof used === "number" && used % 1 !== 0
            ? used.toFixed(1)
            : used.toLocaleString("de-CH")}
          {unit ? ` ${unit}` : ""} /{" "}
          {isUnlimited ? "∞" : `${limit.toLocaleString("de-CH")}${unit ? ` ${unit}` : ""}`}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage > 80
              ? "bg-red-500"
              : percentage > 60
              ? "bg-yellow-500"
              : "bg-blue-500"
          }`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    </div>
  );
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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
  disabled,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="flex items-center p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed">
        <div className="p-2 bg-gray-200 rounded-lg mr-4">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <h3 className="font-medium text-gray-500">{title}</h3>
          <p className="text-sm text-gray-400">Limit erreicht</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
    >
      <div className="p-2 bg-blue-100 rounded-lg mr-4">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}
