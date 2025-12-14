// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { teams, teamMembers, chats } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { Users, MessageSquare, Calendar, CreditCard } from "lucide-react";

async function getTeams() {
  const allTeams = await db.query.teams.findMany({
    orderBy: (teams, { desc }) => [desc(teams.createdAt)],
    with: {
      owner: {
        columns: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  // Get member and chat counts for each team
  const teamsWithStats = await Promise.all(
    allTeams.map(async (team) => {
      const [memberCount] = await db
        .select({ count: count() })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, team.id));

      const [chatCount] = await db
        .select({ count: count() })
        .from(chats)
        .where(eq(chats.teamId, team.id));

      return {
        ...team,
        memberCount: memberCount.count,
        chatCount: chatCount.count,
      };
    })
  );

  return teamsWithStats;
}

export default async function AdminTeamsPage() {
  const allTeams = await getTeams();

  const planColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-800",
    starter: "bg-blue-100 text-blue-800",
    pro: "bg-purple-100 text-purple-800",
    enterprise: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        <p className="text-gray-600 mt-1">Alle Teams der Plattform</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mitglieder
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Chats
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Erstellt
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allTeams.map((team) => (
              <tr key={team.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {team.name}
                    </div>
                    <div className="text-sm text-gray-500">{team.slug}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {team.owner?.name || team.owner?.email || "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      planColors[team.plan] || planColors.free
                    }`}
                  >
                    <CreditCard className="w-3 h-3 mr-1" />
                    {team.plan}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Users className="w-4 h-4 mr-1 text-gray-400" />
                    {team.memberCount}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <MessageSquare className="w-4 h-4 mr-1 text-gray-400" />
                    {team.chatCount} / {team.maxChats === -1 ? "∞" : team.maxChats}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {team.createdAt
                      ? new Date(team.createdAt).toLocaleDateString("de-CH")
                      : "-"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {allTeams.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Keine Teams gefunden
          </div>
        )}
      </div>
    </div>
  );
}
