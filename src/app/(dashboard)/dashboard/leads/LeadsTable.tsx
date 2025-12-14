"use client";

import { useState } from "react";
import {
  Paper,
  Stack,
  Group,
  Text,
  Table,
  Select,
  Button,
  ActionIcon,
  Badge,
  ThemeIcon,
  Avatar,
  Anchor,
} from "@mantine/core";
import {
  IconUsers,
  IconDownload,
  IconMail,
  IconPhone,
  IconMessage,
  IconTrash,
  IconClock,
  IconUserCheck,
  IconCheck,
} from "@tabler/icons-react";

interface Lead {
  id: string;
  chatId: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string;
  status: string | null;
  createdAt: Date | null;
  chatName: string;
}

interface Chat {
  id: string;
  displayName: string;
}

interface LeadsTableProps {
  leads: Lead[];
  chats: Chat[];
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof IconClock }> = {
  new: { label: "Neu", color: "blue", icon: IconClock },
  contacted: { label: "Kontaktiert", color: "yellow", icon: IconUserCheck },
  converted: { label: "Konvertiert", color: "green", icon: IconCheck },
};

const sourceLabels: Record<string, string> = {
  contact_form: "Kontaktformular",
  newsletter: "Newsletter",
  interest: "Interesse",
};

export default function LeadsTable({ leads, chats }: LeadsTableProps) {
  const [filterChat, setFilterChat] = useState<string | null>("all");
  const [filterStatus, setFilterStatus] = useState<string | null>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState(leads);

  // Filter leads
  const filteredLeads = localLeads.filter((lead) => {
    if (filterChat !== "all" && lead.chatId !== filterChat) return false;
    if (filterStatus !== "all" && lead.status !== filterStatus) return false;
    return true;
  });

  // Update lead status
  async function handleStatusChange(leadId: string, newStatus: string | null) {
    if (!newStatus) return;
    setUpdatingId(leadId);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setLocalLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId ? { ...lead, status: newStatus } : lead
          )
        );
      }
    } catch (error) {
      console.error("Error updating lead:", error);
    } finally {
      setUpdatingId(null);
    }
  }

  // Delete lead
  async function handleDelete(leadId: string) {
    if (!confirm("Diesen Lead wirklich löschen?")) return;

    setDeletingId(leadId);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLocalLeads((prev) => prev.filter((lead) => lead.id !== leadId));
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
    } finally {
      setDeletingId(null);
    }
  }

  // Export to CSV
  function handleExport() {
    const headers = ["Name", "E-Mail", "Telefon", "Chat", "Quelle", "Status", "Nachricht", "Datum/Zeit"];
    const rows = filteredLeads.map((lead) => [
      lead.name,
      lead.email,
      lead.phone || "",
      lead.chatName,
      sourceLabels[lead.source] || lead.source,
      statusConfig[lead.status || "new"]?.label || lead.status,
      lead.message?.replace(/"/g, '""') || "",
      lead.createdAt ? new Date(lead.createdAt).toLocaleString("de-CH") : "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (localLeads.length === 0) {
    return (
      <Paper p="xl" withBorder ta="center">
        <Stack align="center" gap="md">
          <ThemeIcon size={64} radius="xl" variant="light" color="gray">
            <IconUsers size={32} />
          </ThemeIcon>
          <div>
            <Text fw={500} size="lg">
              Noch keine Leads
            </Text>
            <Text c="dimmed" size="sm" maw={300} mx="auto" mt="xs">
              Sobald Besucher das Kontaktformular in deinen Chats ausfüllen,
              erscheinen sie hier.
            </Text>
          </div>
        </Stack>
      </Paper>
    );
  }

  const chatSelectData = [
    { value: "all", label: "Alle Chats" },
    ...chats.map((chat) => ({ value: chat.id, label: chat.displayName })),
  ];

  const statusSelectData = [
    { value: "all", label: "Alle Status" },
    { value: "new", label: "Neu" },
    { value: "contacted", label: "Kontaktiert" },
    { value: "converted", label: "Konvertiert" },
  ];

  return (
    <Stack gap="md">
      {/* Filters and Export */}
      <Group justify="space-between" wrap="wrap">
        <Group gap="sm">
          <Select
            value={filterChat}
            onChange={setFilterChat}
            data={chatSelectData}
            size="sm"
            w={180}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            data={statusSelectData}
            size="sm"
            w={150}
          />
        </Group>
        <Button variant="outline" leftSection={<IconDownload size={16} />} onClick={handleExport}>
          CSV Export
        </Button>
      </Group>

      {/* Table */}
      <Paper withBorder>
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Kontakt</Table.Th>
                <Table.Th>Chat</Table.Th>
                <Table.Th>Quelle</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Datum/Zeit</Table.Th>
                <Table.Th ta="right">Aktionen</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredLeads.map((lead) => {
                const statusInfo = statusConfig[lead.status || "new"] || statusConfig.new;

                return (
                  <Table.Tr key={lead.id}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar radius="xl" color="gray">
                          <IconUsers size={20} />
                        </Avatar>
                        <div>
                          <Text size="sm" fw={500}>
                            {lead.name}
                          </Text>
                          <Group gap="md">
                            <Anchor href={`mailto:${lead.email}`} size="xs" c="dimmed">
                              <Group gap={4}>
                                <IconMail size={12} />
                                {lead.email}
                              </Group>
                            </Anchor>
                            {lead.phone && (
                              <Anchor href={`tel:${lead.phone}`} size="xs" c="dimmed">
                                <Group gap={4}>
                                  <IconPhone size={12} />
                                  {lead.phone}
                                </Group>
                              </Anchor>
                            )}
                          </Group>
                          {lead.message && (
                            <Text size="xs" c="dimmed" mt={4} lineClamp={1} maw={250}>
                              <IconMessage size={12} style={{ display: "inline", marginRight: 4 }} />
                              {lead.message}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{lead.chatName}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{sourceLabels[lead.source] || lead.source}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Select
                        size="xs"
                        value={lead.status || "new"}
                        onChange={(val) => handleStatusChange(lead.id, val)}
                        disabled={updatingId === lead.id}
                        data={[
                          { value: "new", label: "Neu" },
                          { value: "contacted", label: "Kontaktiert" },
                          { value: "converted", label: "Konvertiert" },
                        ]}
                        w={130}
                        styles={{
                          input: {
                            backgroundColor: `var(--mantine-color-${statusInfo.color}-0)`,
                            color: `var(--mantine-color-${statusInfo.color}-7)`,
                            fontWeight: 500,
                          },
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {lead.createdAt
                          ? new Date(lead.createdAt).toLocaleString("de-CH")
                          : "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleDelete(lead.id)}
                          loading={deletingId === lead.id}
                          title="Löschen"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {/* Footer with count */}
        <Group p="sm" bg="gray.0" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
          <Text size="sm" c="dimmed">
            {filteredLeads.length} von {localLeads.length} Leads
          </Text>
        </Group>
      </Paper>
    </Stack>
  );
}
