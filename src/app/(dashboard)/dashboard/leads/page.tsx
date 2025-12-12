import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { leads, teamMembers, chats } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import LeadsTable from "./LeadsTable";

export default async function LeadsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Get user's team ID
  let teamId = session.user.teamId;
  if (!teamId) {
    const membership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, session.user.id),
    });
    teamId = membership?.teamId;
  }

  if (!teamId) {
    redirect("/dashboard");
  }

  // Load all leads for the team
  const teamLeads = await db.query.leads.findMany({
    where: eq(leads.teamId, teamId),
    orderBy: [desc(leads.createdAt)],
  });

  // Load all chats for the team (for filter dropdown)
  const teamChats = await db.query.chats.findMany({
    where: eq(chats.teamId, teamId),
    columns: {
      id: true,
      displayName: true,
    },
  });

  // Create a map of chatId to chat info
  const chatMap = new Map(teamChats.map((c) => [c.id, c.displayName]));

  // Enrich leads with chat names
  const enrichedLeads = teamLeads.map((lead) => ({
    ...lead,
    chatName: lead.chatId ? chatMap.get(lead.chatId) || "Unbekannt" : "Unbekannt",
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">
            Verwalte deine gesammelten Kontakte
          </p>
        </div>
      </div>

      {/* Leads Table */}
      <LeadsTable
        leads={enrichedLeads}
        chats={teamChats}
      />
    </div>
  );
}
