"use client";

import { useEffect, useState } from "react";
import {
  Paper,
  Stack,
  SimpleGrid,
  Table,
  Text,
  Title,
  Loader,
  Center,
  Group,
  Badge,
} from "@mantine/core";
import {
  Users,
  MessageSquare,
  Clock,
  AlertTriangle,
  Zap,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  User,
  Bot,
} from "lucide-react";
import { StatCard } from "@/components/analytics/StatCard";
import { ChartContainer } from "@/components/analytics/SimpleChart";
import {
  formatTokens,
  formatResponseTime,
  formatRelativeTime,
} from "@/lib/admin-stats";

interface AnalyticsData {
  totalSessions: number;
  totalMessages: number;
  userMessages: number;
  botMessages: number;
  avgResponseTime: number;
  errorRate: string;
  errorCount: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalTokens: number;
  estimatedCostCents: number;
  positiveFeeback: number;
  negativeFeeback: number;
  dailyStats: { date: string; messages: number; tokens: number }[];
  recentSessions: {
    id: string;
    visitorId: string | null;
    totalMessages: number;
    userMessages: number;
    botMessages: number;
    durationMins: number;
    createdAt: string | null;
    lastActivityAt: string | null;
  }[];
  recentMessages: {
    id: string;
    sessionId: string;
    role: string;
    content: string;
    feedback: number | null;
    hadError: boolean | null;
    createdAt: string | null;
  }[];
}

interface AnalyticsContentProps {
  chatId: string;
}

export function AnalyticsContent({ chatId }: AnalyticsContentProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await fetch(`/api/chats/${chatId}/analytics`);
        if (!response.ok) {
          throw new Error("Fehler beim Laden der Statistiken");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [chatId]);

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (error || !data) {
    return (
      <Paper p="xl" withBorder ta="center">
        <Text c="dimmed">{error || "Keine Daten gefunden"}</Text>
      </Paper>
    );
  }

  const formatCost = (cents: number) => {
    return "CHF " + (cents / 100).toFixed(2);
  };

  return (
    <Stack gap="md">
      {/* Overview Stats */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        <StatCard
          title="Sessions"
          value={data.totalSessions.toLocaleString("de-CH")}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Nachrichten"
          value={data.totalMessages.toLocaleString("de-CH")}
          icon={MessageSquare}
          color="green"
          subtitle={`${data.userMessages} User / ${data.botMessages} Bot`}
        />
        <StatCard
          title="Antwortzeit"
          value={formatResponseTime(data.avgResponseTime)}
          icon={Clock}
          color="violet"
          subtitle="Durchschnitt"
        />
        <StatCard
          title="Fehlerrate"
          value={data.errorRate + "%"}
          icon={AlertTriangle}
          color={data.errorCount > 0 ? "red" : "green"}
          subtitle={`${data.errorCount} Fehler`}
        />
      </SimpleGrid>

      {/* Token & Cost Stats */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        <StatCard
          title="Total Tokens"
          value={formatTokens(data.totalTokens)}
          icon={Zap}
          color="cyan"
        />
        <StatCard
          title="Input Tokens"
          value={formatTokens(data.totalTokensInput)}
          icon={Zap}
          color="blue"
        />
        <StatCard
          title="Output Tokens"
          value={formatTokens(data.totalTokensOutput)}
          icon={Zap}
          color="violet"
        />
        <StatCard
          title="Geschätzte Kosten"
          value={formatCost(data.estimatedCostCents)}
          icon={DollarSign}
          color="orange"
          subtitle="Gemini Flash"
        />
      </SimpleGrid>

      {/* Feedback Stats */}
      {(data.positiveFeeback > 0 || data.negativeFeeback > 0) && (
        <SimpleGrid cols={2} spacing="sm">
          <StatCard
            title="Positives Feedback"
            value={data.positiveFeeback}
            icon={ThumbsUp}
            color="green"
          />
          <StatCard
            title="Negatives Feedback"
            value={data.negativeFeeback}
            icon={ThumbsDown}
            color="red"
          />
        </SimpleGrid>
      )}

      {/* Charts */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <ChartContainer
          title="Nachrichten (letzte 30 Tage)"
          data={data.dailyStats}
          dataKey="messages"
          color="#22c55e"
        />
        <ChartContainer
          title="Token-Verbrauch (letzte 30 Tage)"
          data={data.dailyStats}
          dataKey="tokens"
          color="#3b82f6"
        />
      </SimpleGrid>

      {/* Recent Sessions */}
      <Paper withBorder>
        <Group p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
          <Title order={4}>Letzte Sessions</Title>
        </Group>
        {data.recentSessions.length === 0 ? (
          <Text p="xl" ta="center" c="dimmed">
            Noch keine Sessions vorhanden
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={500}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Zeitpunkt</Table.Th>
                  <Table.Th>Nachrichten</Table.Th>
                  <Table.Th>Dauer</Table.Th>
                  <Table.Th>Visitor</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.recentSessions.map((session) => (
                  <Table.Tr key={session.id}>
                    <Table.Td>
                      {session.createdAt
                        ? formatRelativeTime(new Date(session.createdAt))
                        : "-"}
                    </Table.Td>
                    <Table.Td>
                      <Text component="span" fw={500}>{session.totalMessages}</Text>
                      <Text component="span" c="dimmed" size="sm" ml={4}>
                        ({session.userMessages}/{session.botMessages})
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {session.durationMins > 0
                        ? `${session.durationMins} Min.`
                        : "< 1 Min."}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace" c="dimmed">
                        {session.visitorId
                          ? session.visitorId.slice(0, 8) + "..."
                          : "-"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* Recent Messages */}
      <Paper withBorder>
        <Group p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
          <Title order={4}>Letzte Nachrichten</Title>
        </Group>
        {!data.recentMessages || data.recentMessages.length === 0 ? (
          <Text p="xl" ta="center" c="dimmed">
            Noch keine Nachrichten vorhanden
          </Text>
        ) : (
          <Stack p="md" gap="xs" mah={600} style={{ overflowY: "auto" }}>
            {data.recentMessages.map((message) => (
              <Group
                key={message.id}
                justify={message.role === "assistant" ? "flex-start" : "flex-end"}
              >
                <Paper
                  p="sm"
                  withBorder
                  maw="80%"
                  bg={message.role === "user" ? "blue.0" : "gray.0"}
                  style={{
                    borderColor: message.role === "user"
                      ? "var(--mantine-color-blue-2)"
                      : "var(--mantine-color-gray-3)",
                  }}
                >
                  <Group gap="xs" mb={4}>
                    {message.role === "user" ? (
                      <User size={14} color="var(--mantine-color-blue-6)" />
                    ) : (
                      <Bot size={14} color="var(--mantine-color-gray-6)" />
                    )}
                    <Text
                      size="xs"
                      fw={500}
                      c={message.role === "user" ? "blue.6" : "gray.6"}
                    >
                      {message.role === "user" ? "Benutzer" : "Bot"}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {message.createdAt
                        ? formatRelativeTime(new Date(message.createdAt))
                        : ""}
                    </Text>
                    {message.feedback === 1 && (
                      <ThumbsUp size={12} color="var(--mantine-color-green-6)" />
                    )}
                    {message.feedback === -1 && (
                      <ThumbsDown size={12} color="var(--mantine-color-red-6)" />
                    )}
                    {message.hadError && (
                      <Badge size="xs" color="red" variant="light">Fehler</Badge>
                    )}
                  </Group>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {message.content.length > 500
                      ? message.content.slice(0, 500) + "..."
                      : message.content}
                  </Text>
                </Paper>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
