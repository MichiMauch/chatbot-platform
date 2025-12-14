// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { users, teamMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Shield, Mail, Calendar } from "lucide-react";

async function getUsers() {
  const allUsers = await db.query.users.findMany({
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  });

  // Get team memberships for each user
  const usersWithTeams = await Promise.all(
    allUsers.map(async (user) => {
      const membership = await db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, user.id),
        with: { team: true },
      });
      return {
        ...user,
        team: membership?.team,
        teamRole: membership?.role,
      };
    })
  );

  return usersWithTeams;
}

export default async function AdminUsersPage() {
  const allUsers = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Benutzer</h1>
        <p className="text-gray-600 mt-1">
          Alle registrierten Benutzer der Plattform
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Benutzer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rolle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registriert
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {user.image ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={user.image}
                          alt=""
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {(user.name || user.email)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        {user.name || "Kein Name"}
                        {user.isSuperAdmin && (
                          <Shield className="w-4 h-4 text-red-500 ml-2" />
                        )}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.team ? (
                    <span className="text-sm text-gray-900">{user.team.name}</span>
                  ) : (
                    <span className="text-sm text-gray-400">Kein Team</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.teamRole && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.teamRole === "owner"
                          ? "bg-purple-100 text-purple-800"
                          : user.teamRole === "admin"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.teamRole}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("de-CH")
                      : "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isSuperAdmin ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Super-Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Aktiv
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {allUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Keine Benutzer gefunden
          </div>
        )}
      </div>
    </div>
  );
}
