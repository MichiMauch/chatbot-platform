// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teams, teamMembers, teamInvitations } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import {
  Paper,
  Stack,
  Group,
  Text,
  Title,
  Alert,
  ThemeIcon,
} from "@mantine/core";
import {
  IconUsers,
  IconShield,
  IconCrown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { TeamMembersList } from "@/components/team/TeamMembersList";
import { InvitationsList } from "@/components/team/InvitationsList";
import { getPlan } from "@/lib/stripe";
import { SetPageTitle } from "@/components/SetPageTitle";

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
      <>
        <SetPageTitle title="Team" subtitle="Verwalte dein Team und lade Mitglieder ein" />
        <Paper p="xl" withBorder ta="center">
          <Stack align="center" gap="md">
            <ThemeIcon size={48} radius="xl" variant="light" color="gray">
              <IconUsers size={24} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="lg">
                Kein Team gefunden
              </Text>
              <Text c="dimmed" size="sm">
                Du bist keinem Team zugeordnet. Bitte kontaktiere den Support.
              </Text>
            </div>
          </Stack>
        </Paper>
      </>
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
    <>
      <SetPageTitle
        title="Team"
        subtitle="Verwalte dein Team und lade Mitglieder ein"
        headerAction={
          canManageMembers
            ? { icon: "user-plus", tooltip: "Mitglied einladen", disabled: !canInvite }
            : undefined
        }
      />

      <Stack gap="md">
        {/* Free Plan Hint */}
        {!canInvite && team.plan === "free" && (
          <Alert
            icon={<IconTrendingUp size={18} />}
            color="yellow"
            title="Der Free Plan erlaubt nur 1 Benutzer"
          >
            <Text size="sm">
              Upgrade deinen Plan, um weitere Team-Mitglieder einzuladen.
            </Text>
            <Link href="/dashboard/billing" style={{ textDecoration: "none" }}>
              <Text size="sm" c="yellow.8" fw={500} mt="xs">
                Jetzt upgraden
              </Text>
            </Link>
          </Alert>
        )}

        {/* Team Info */}
        <Paper p="md" withBorder>
          <Group>
            <ThemeIcon size="xl" variant="light">
              <IconUsers size={28} />
            </ThemeIcon>
            <div>
              <Title order={4}>{team.name}</Title>
              <Text c="dimmed" size="sm">
                {members.length} Mitglied{members.length !== 1 ? "er" : ""} •{" "}
                <Text component="span" tt="capitalize">
                  {team.plan}
                </Text>{" "}
                Plan
              </Text>
            </div>
          </Group>
        </Paper>

        {/* Members List */}
        <Paper withBorder>
          <Group p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
            <Title order={5}>Mitglieder</Title>
          </Group>
          <TeamMembersList
            members={members}
            currentUserId={session.user.id}
            canManageMembers={canManageMembers}
            canChangeRoles={canChangeRoles}
          />
        </Paper>

        {/* Pending Invitations */}
        {invitations.length > 0 && canManageMembers && (
          <Paper withBorder>
            <Group p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
              <Title order={5}>
                Ausstehende Einladungen ({invitations.length})
              </Title>
            </Group>
            <InvitationsList invitations={invitations} />
          </Paper>
        )}

        {/* Roles Info */}
        <Paper p="md" withBorder bg="gray.0">
          <Title order={5} mb="md">
            Rollen
          </Title>
          <Stack gap="sm">
            <RoleDescription
              icon={IconCrown}
              name="Owner"
              description="Volle Kontrolle über das Team, kann Mitglieder verwalten und das Abo ändern"
              color="yellow"
            />
            <RoleDescription
              icon={IconShield}
              name="Admin"
              description="Kann Chats erstellen und bearbeiten, Mitglieder einladen"
              color="blue"
            />
            <RoleDescription
              icon={IconUsers}
              name="Member"
              description="Kann Chats nutzen und eigene Nachrichten sehen"
              color="gray"
            />
          </Stack>
        </Paper>
      </Stack>
    </>
  );
}

function RoleDescription({
  icon: Icon,
  name,
  description,
  color,
}: {
  icon: React.ComponentType<{ size?: number }>;
  name: string;
  description: string;
  color: "yellow" | "blue" | "gray";
}) {
  return (
    <Group gap="sm">
      <ThemeIcon size="md" variant="light" color={color}>
        <Icon size={16} />
      </ThemeIcon>
      <div>
        <Text fw={500} size="sm">
          {name}
        </Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </div>
    </Group>
  );
}
