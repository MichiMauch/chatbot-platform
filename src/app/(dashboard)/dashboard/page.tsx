// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Paper,
  Stack,
  Group,
  Text,
  Title,
  Badge,
  Progress,
  SimpleGrid,
  ThemeIcon,
  ActionIcon,
} from "@mantine/core";
import {
  IconMessageCircle,
  IconUsers,
  IconPlus,
  IconExternalLink,
  IconSettings,
  IconTrendingUp,
  IconServer,
} from "@tabler/icons-react";
import { db } from "@/lib/db";
import { chats, teamMembers, teams, chatSessions, chatMessages } from "@/lib/schema";
import { eq, count, and, gte } from "drizzle-orm";
import { calculateStorageFromFiles } from "@/lib/admin-stats";
import { SetPageTitle } from "@/components/SetPageTitle";

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
    <>
      <SetPageTitle
        title={`Willkommen, ${session.user.name || "Benutzer"}!`}
        subtitle="Hier ist eine Übersicht deiner Chatbots und Nutzung."
      />

      <Stack gap="md">
        {/* Usage Overview */}
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Deine Nutzung</Title>
            <Badge variant="light" size="lg" tt="capitalize">
              {currentPlan} Plan
            </Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            <UsageBar
              label="Chatbots"
              used={usage.chats.used}
              limit={usage.chats.limit}
              icon={IconMessageCircle}
            />
            <UsageBar
              label="Nachrichten / Monat"
              used={usage.messages.used}
              limit={usage.messages.limit}
              icon={IconMessageCircle}
            />
            <UsageBar
              label="Speicher"
              used={usage.storage.used}
              limit={usage.storage.limit}
              unit="MB"
              icon={IconServer}
            />
          </SimpleGrid>
          {currentPlan === "free" && (
            <Group mt="md" pt="md" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
              <Link href="/dashboard/billing" style={{ textDecoration: "none" }}>
                <Group gap={4}>
                  <IconTrendingUp size={16} />
                  <Text size="sm" c="blue">Für mehr Kapazität upgraden</Text>
                </Group>
              </Link>
            </Group>
          )}
        </Paper>

        {/* Stats Grid */}
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
          <StatCard
            title="Aktive Chats"
            value={`${stats.totalChats} / ${usage.chats.limit === -1 ? "∞" : usage.chats.limit}`}
            icon={IconMessageCircle}
            color="blue"
          />
          <StatCard
            title="Nachrichten (Monat)"
            value={`${usage.messages.used} / ${usage.messages.limit === -1 ? "∞" : usage.messages.limit}`}
            icon={IconMessageCircle}
            color="green"
          />
          <StatCard
            title="Team-Mitglieder"
            value={stats.teamMembers}
            icon={IconUsers}
            color="violet"
          />
        </SimpleGrid>

        {/* Quick Actions */}
        <Paper p="md" withBorder>
          <Title order={4} mb="md">
            Schnellzugriff
          </Title>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            <QuickActionCard
              title="Neuen Chat erstellen"
              description="Erstelle einen neuen RAG-Chatbot"
              href="/dashboard/chats/new"
              icon={IconPlus}
              disabled={usage.chats.used >= usage.chats.limit && usage.chats.limit !== -1}
            />
            <QuickActionCard
              title="Team verwalten"
              description="Lade Mitglieder ein"
              href="/dashboard/team"
              icon={IconUsers}
            />
            <QuickActionCard
              title="Abo verwalten"
              description="Plan und Rechnungen"
              href="/dashboard/billing"
              icon={IconTrendingUp}
            />
          </SimpleGrid>
        </Paper>

        {/* Recent Chats */}
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Deine Chats</Title>
            <Link href="/dashboard/chats">
              <Text size="sm" c="blue">Alle anzeigen</Text>
            </Link>
          </Group>
          {teamChats.length === 0 ? (
            <Stack align="center" py="xl">
              <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                <IconMessageCircle size={24} />
              </ThemeIcon>
              <Text c="dimmed">Du hast noch keine Chats erstellt.</Text>
              <Link href="/dashboard/chats/new" style={{ textDecoration: "none" }}>
                <Group gap={4}>
                  <IconPlus size={16} />
                  <Text size="sm" c="blue">Ersten Chat erstellen</Text>
                </Group>
              </Link>
            </Stack>
          ) : (
            <Stack gap="xs">
              {teamChats.map((chat) => (
                <Group key={chat.id} justify="space-between" py="xs">
                  <Group gap="sm">
                    <ThemeIcon size="lg" variant="light">
                      <IconMessageCircle size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={500}>{chat.displayName}</Text>
                      <Text size="xs" c="dimmed" ff="monospace">
                        /c/{chat.name}
                      </Text>
                    </div>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon
                      component="a"
                      href={`/c/${chat.name}`}
                      target="_blank"
                      variant="subtle"
                      color="gray"
                      title="Chat öffnen"
                    >
                      <IconExternalLink size={18} />
                    </ActionIcon>
                    <Link href={`/dashboard/chats/${chat.id}`}>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        title="Einstellungen"
                      >
                        <IconSettings size={18} />
                      </ActionIcon>
                    </Link>
                  </Group>
                </Group>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>
    </>
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
  icon: React.ComponentType<{ size?: number }>;
}) {
  const percentage = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  const isUnlimited = limit === -1;
  const formattedUsed =
    typeof used === "number" && used % 1 !== 0
      ? used.toFixed(1)
      : used.toLocaleString("de-CH");
  const formattedLimit = isUnlimited
    ? "∞"
    : `${limit.toLocaleString("de-CH")}${unit ? ` ${unit}` : ""}`;

  return (
    <Stack gap={4}>
      <Group justify="space-between">
        <Group gap="xs">
          <Icon size={16} />
          <Text size="sm" c="dimmed">
            {label}
          </Text>
        </Group>
        <Text size="sm" fw={500}>
          {formattedUsed}
          {unit ? ` ${unit}` : ""} / {formattedLimit}
        </Text>
      </Group>
      <Progress
        value={Math.max(percentage, 2)}
        size="sm"
        color={percentage > 80 ? "red" : percentage > 60 ? "yellow" : "blue"}
        radius="xl"
      />
    </Stack>
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
  icon: React.ComponentType<{ size?: number }>;
  color: "blue" | "green" | "violet" | "orange";
}) {
  return (
    <Paper p="md" withBorder>
      <Group justify="space-between">
        <div>
          <Text size="sm" c="dimmed">
            {title}
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {value}
          </Text>
        </div>
        <ThemeIcon size="xl" radius="md" variant="light" color={color}>
          <Icon size={24} />
        </ThemeIcon>
      </Group>
    </Paper>
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
  icon: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <Paper p="md" withBorder bg="gray.0" style={{ opacity: 0.6, cursor: "not-allowed" }}>
        <Group>
          <ThemeIcon size="lg" variant="light" color="gray">
            <Icon size={20} />
          </ThemeIcon>
          <div>
            <Text fw={500} c="dimmed">
              {title}
            </Text>
            <Text size="sm" c="dimmed">
              Limit erreicht
            </Text>
          </div>
        </Group>
      </Paper>
    );
  }

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Paper p="md" withBorder style={{ cursor: "pointer" }}>
        <Group>
          <ThemeIcon size="lg" variant="light">
            <Icon size={20} />
          </ThemeIcon>
          <div>
            <Text fw={500}>{title}</Text>
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          </div>
        </Group>
      </Paper>
    </Link>
  );
}
