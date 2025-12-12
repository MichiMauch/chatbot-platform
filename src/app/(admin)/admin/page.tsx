import { db } from "@/lib/db";
import { users, teams, chats, chatSessions, chatMessages } from "@/lib/schema";
import { count, sql } from "drizzle-orm";
import { Users, Building2, MessageSquare, MessagesSquare } from "lucide-react";

async function getStats() {
  const [userCount] = await db.select({ count: count() }).from(users);
  const [teamCount] = await db.select({ count: count() }).from(teams);
  const [chatCount] = await db.select({ count: count() }).from(chats);
  const [sessionCount] = await db.select({ count: count() }).from(chatSessions);
  const [messageCount] = await db.select({ count: count() }).from(chatMessages);

  // Recent activity (last 7 days)
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const [recentMessages] = await db
    .select({ count: count() })
    .from(chatMessages)
    .where(sql`${chatMessages.createdAt} > ${sevenDaysAgo}`);

  return {
    users: userCount.count,
    teams: teamCount.count,
    chats: chatCount.count,
    sessions: sessionCount.count,
    messages: messageCount.count,
    recentMessages: recentMessages.count,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const statCards = [
    {
      name: "Benutzer",
      value: stats.users,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      name: "Teams",
      value: stats.teams,
      icon: Building2,
      color: "bg-green-500",
    },
    {
      name: "Chats",
      value: stats.chats,
      icon: MessageSquare,
      color: "bg-purple-500",
    },
    {
      name: "Nachrichten (gesamt)",
      value: stats.messages,
      icon: MessagesSquare,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin-Übersicht</h1>
        <p className="text-gray-600 mt-1">
          Plattform-weite Statistiken und Verwaltung
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg shadow p-6 flex items-center"
          >
            <div className={`${stat.color} p-3 rounded-lg`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Aktivität (letzte 7 Tage)
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Neue Nachrichten</span>
              <span className="font-semibold text-gray-900">
                {stats.recentMessages}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Aktive Sessions</span>
              <span className="font-semibold text-gray-900">
                {stats.sessions}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Schnellzugriff
          </h2>
          <div className="space-y-2">
            <a
              href="/admin/users"
              className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Users className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-700">Benutzer verwalten</span>
              </div>
            </a>
            <a
              href="/admin/teams"
              className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-700">Teams verwalten</span>
              </div>
            </a>
            <a
              href="/admin/chats"
              className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <MessageSquare className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-700">Alle Chats anzeigen</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
