import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teams, teamMembers, teamInvitations } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { Users, Mail, Shield, Crown, UserPlus, TrendingUp } from "lucide-react";
import { TeamMembersList } from "@/components/team/TeamMembersList";
import { InvitationsList } from "@/components/team/InvitationsList";
import { InviteButton } from "@/components/team/InviteButton";
import { getPlan } from "@/lib/stripe";
import Link from "next/link";

async function getTeamData(userId: string, teamId?: string) {
  if (!teamId) {
    // Get team from membership
    const membership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, userId),
      with: { team: true },
    });
    if (!membership) return null;
    teamId = membership.teamId;
  }

  // Get team details
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!team) return null;

  // Get all members with user info
  const members = await db.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: (tm, { asc }) => [asc(tm.joinedAt)],
  });

  // Get pending invitations
  const invitations = await db.query.teamInvitations.findMany({
    where: and(
      eq(teamInvitations.teamId, teamId),
      eq(teamInvitations.status, "pending")
    ),
    orderBy: (inv, { desc }) => [desc(inv.createdAt)],
  });

  // Get current user's role
  const currentMembership = members.find((m) => m.userId === userId);

  return {
    team,
    members: members.map((m) => ({
      id: m.id,
      odcuserId: m.userId,
      name: m.user.name || m.user.email.split("@")[0],
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    invitations: invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      token: inv.token,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    })),
    currentUserRole: currentMembership?.role || "member",
  };
}

export default async function TeamPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getTeamData(session.user.id, session.user.teamId);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Kein Team gefunden</h2>
          <p className="text-gray-500">
            Du bist keinem Team zugeordnet. Bitte kontaktiere den Support.
          </p>
        </div>
      </div>
    );
  }

  const { team, members, invitations, currentUserRole } = data;
  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";
  const canChangeRoles = currentUserRole === "owner";

  // Check plan limits for invitations
  const plan = getPlan(team.plan || "free");
  const maxMembers = plan.limits.maxMembers;
  const canInvite = maxMembers === -1 || members.length < maxMembers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 mt-1">
            Verwalte dein Team und lade Mitglieder ein
          </p>
        </div>
        {canManageMembers && <InviteButton disabled={!canInvite} />}
      </div>

      {/* Free Plan Hint */}
      {!canInvite && team.plan === "free" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 font-medium">
                Der Free Plan erlaubt nur 1 Benutzer
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Upgrade deinen Plan, um weitere Team-Mitglieder einzuladen.
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center text-sm text-amber-800 font-medium mt-2 hover:underline"
              >
                Jetzt upgraden
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Team Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
            <p className="text-gray-500">
              {members.length} Mitglied{members.length !== 1 ? "er" : ""} •{" "}
              <span className="capitalize">{team.plan}</span> Plan
            </p>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Mitglieder</h3>
        </div>
        <TeamMembersList
          members={members}
          currentUserId={session.user.id}
          canManageMembers={canManageMembers}
          canChangeRoles={canChangeRoles}
        />
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && canManageMembers && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Ausstehende Einladungen ({invitations.length})
            </h3>
          </div>
          <InvitationsList invitations={invitations} />
        </div>
      )}

      {/* Roles Info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Rollen</h3>
        <div className="space-y-3">
          <RoleDescription
            icon={Crown}
            name="Owner"
            description="Volle Kontrolle über das Team, kann Mitglieder verwalten und das Abo ändern"
            color="yellow"
          />
          <RoleDescription
            icon={Shield}
            name="Admin"
            description="Kann Chats erstellen und bearbeiten, Mitglieder einladen"
            color="blue"
          />
          <RoleDescription
            icon={Users}
            name="Member"
            description="Kann Chats nutzen und eigene Nachrichten sehen"
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}

function RoleDescription({
  icon: Icon,
  name,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  color: "yellow" | "blue" | "gray";
}) {
  const colors = {
    yellow: "bg-yellow-100 text-yellow-600",
    blue: "bg-blue-100 text-blue-600",
    gray: "bg-gray-200 text-gray-600",
  };

  return (
    <div className="flex items-start space-x-3">
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
