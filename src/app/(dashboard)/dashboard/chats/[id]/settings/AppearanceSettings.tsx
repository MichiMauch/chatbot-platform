"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSettingsSave } from "@/contexts/SettingsSaveContext";
import {
  TextInput,
  Textarea,
  Switch,
  Button,
  Paper,
  Text,
  SimpleGrid,
  Group,
  Stack,
  ColorSwatch,
  CheckIcon,
  Alert,
  Code,
  CopyButton,
  ActionIcon,
  Tooltip,
  Box,
  Anchor,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconPlus,
  IconX,
  IconAlertTriangle,
  IconCheck,
  IconCopy,
} from "@tabler/icons-react";
import { Bot, Calendar, Mail, Users, Code as CodeIcon, MessageCircle } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { themeColors, type ThemeColor } from "@/lib/systemInstructionTemplates";
import { chatLogos, type ChatLogoId } from "@/lib/chatLogos";

const LottieLoader = dynamic(() => import("@/components/LottieLoader"), { ssr: false });

interface Chat {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  themeColor: string | null;
  isPublic: boolean | null;
  allowAnonymous: boolean | null;
  starterQuestions: string | null;
  welcomeMessage: string | null;
  chatLogo: string | null;
  leadCaptureEnabled: boolean | null;
  leadCaptureTrigger: string | null;
  calendarEnabled: boolean | null;
  calendarLink: string | null;
  newsletterEnabled: boolean | null;
  newsletterTrigger: string | null;
  widgetEnabled: boolean | null;
  embedEnabled: boolean | null;
  widgetBubbleText: string | null;
}

interface AppearanceSettingsProps {
  chat: Chat;
  allowPublicChats?: boolean;
  allowEmbed?: boolean;
}

export function AppearanceSettings({ chat, allowPublicChats = true, allowEmbed = false }: AppearanceSettingsProps) {
  const router = useRouter();
  const { setSaveButton } = useSettingsSave();
  const [isSaving, setIsSaving] = useState(false);

  const [displayName, setDisplayName] = useState(chat.displayName);
  const [description, setDescription] = useState(chat.description || "");
  const [themeColor, setThemeColor] = useState<ThemeColor>((chat.themeColor as ThemeColor) || "blue");
  const [starterQuestions, setStarterQuestions] = useState<string[]>(() => {
    if (!chat.starterQuestions) return [];
    try {
      const parsed = JSON.parse(chat.starterQuestions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [welcomeMessage, setWelcomeMessage] = useState(chat.welcomeMessage || "");
  const [chatLogo, setChatLogo] = useState<ChatLogoId>((chat.chatLogo as ChatLogoId) || "default");
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(chat.leadCaptureEnabled ?? false);
  const [calendarEnabled, setCalendarEnabled] = useState(chat.calendarEnabled ?? false);
  const [calendarLink, setCalendarLink] = useState(chat.calendarLink || "");
  const [newsletterEnabled, setNewsletterEnabled] = useState(chat.newsletterEnabled ?? false);
  const [widgetEnabled, setWidgetEnabled] = useState(chat.widgetEnabled ?? false);
  const [embedEnabled, setEmbedEnabled] = useState(chat.embedEnabled ?? false);
  const [widgetBubbleText, setWidgetBubbleText] = useState(chat.widgetBubbleText || "");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          description,
          themeColor,
          starterQuestions: starterQuestions.filter(q => q.trim()).length > 0
            ? JSON.stringify(starterQuestions.filter(q => q.trim()))
            : null,
          welcomeMessage: welcomeMessage.trim() || null,
          chatLogo,
          leadCaptureEnabled,
          calendarEnabled,
          calendarLink: calendarLink.trim() || null,
          newsletterEnabled,
          widgetEnabled,
          embedEnabled,
          widgetBubbleText: widgetBubbleText.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Fehler beim Speichern");
        return;
      }

      toast.success("Einstellungen gespeichert");
      router.refresh();
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setIsSaving(false);
    }
  }, [chat.id, displayName, description, themeColor, starterQuestions, welcomeMessage, chatLogo, leadCaptureEnabled, calendarEnabled, calendarLink, newsletterEnabled, widgetEnabled, embedEnabled, widgetBubbleText, router]);

  // Set save button in context for ChatTabs
  useEffect(() => {
    setSaveButton(
      <Button
        leftSection={<IconDeviceFloppy size={16} />}
        loading={isSaving}
        onClick={handleSave}
      >
        Speichern
      </Button>
    );
    return () => setSaveButton(null);
  }, [isSaving, handleSave, setSaveButton]);

  const logoPath = chatLogo && chatLogo !== "default"
    ? chatLogos.find(l => l.id === chatLogo)?.path
    : null;

  const buildWidgetCode = () => {
    let attrs = `data-chat-id="${chat.id}"`;
    if (widgetBubbleText.trim()) {
      attrs += ` data-bubble-text="${widgetBubbleText.trim().replace(/"/g, '&quot;')}"`;
    }
    if (logoPath) {
      attrs += ` data-logo="${logoPath}"`;
    }
    return `<script src="${baseUrl}/widget.js" ${attrs}></script>`;
  };

  const widgetCode = buildWidgetCode();
  const embedCode = `<iframe src="${baseUrl}/embed/${chat.id}" width="100%" height="600" style="border:none;border-radius:12px;"></iframe>`;

  return (
    <Stack gap="md">
      {/* Allgemein */}
      <Paper p="sm" withBorder>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            id="chat-display-name"
            label="Anzeigename"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Mein Chatbot"
            size="sm"
          />
          <Textarea
            id="chat-description"
            label="Beschreibung"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Wofür wird dieser Chatbot verwendet?"
            size="sm"
            minRows={1}
            autosize
          />
        </SimpleGrid>
      </Paper>

      {/* Farbe + Logo */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper p="sm" withBorder>
          <Text size="sm" fw={500} mb="xs">Farbthema</Text>
          <Group gap="xs">
            {themeColors.map((theme) => (
              <ColorSwatch
                key={theme.id}
                color={theme.color}
                onClick={() => setThemeColor(theme.id)}
                style={{ cursor: "pointer" }}
                size={32}
              >
                {themeColor === theme.id && <CheckIcon style={{ width: 14, height: 14, color: "white" }} />}
              </ColorSwatch>
            ))}
          </Group>
        </Paper>

        <Paper p="sm" withBorder>
          <Text size="sm" fw={500} mb="xs">Chat-Logo</Text>
          <Group gap={4}>
            {chatLogos.map((logo) => (
              <Box
                key={logo.id}
                onClick={() => setChatLogo(logo.id)}
                style={{
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 8,
                  border: chatLogo === logo.id ? "2px solid var(--mantine-color-cyan-6)" : "2px solid transparent",
                  background: chatLogo === logo.id ? "var(--mantine-color-cyan-0)" : "transparent",
                }}
              >
                {logo.path ? (
                  <div style={{ width: 32, height: 32 }}>
                    <LottieLoader path={logo.path} loop autoplay style={{ width: "100%", height: "100%" }} />
                  </div>
                ) : (
                  <Bot size={32} color="gray" />
                )}
              </Box>
            ))}
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Begrüssung + Startfragen */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper p="sm" withBorder>
          <Textarea
            id="chat-welcome-message"
            label="Begrüssungsnachricht"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="Hallo! Wie kann ich helfen?"
            size="sm"
            minRows={2}
            autosize
          />
        </Paper>

        <Paper p="sm" withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>Startfragen (max. 4)</Text>
            {starterQuestions.length < 4 && (
              <Button
                variant="subtle"
                size="compact-xs"
                leftSection={<IconPlus size={14} />}
                onClick={() => setStarterQuestions([...starterQuestions, ""])}
              >
                Hinzufügen
              </Button>
            )}
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {starterQuestions.map((q, i) => (
              <Group key={i} gap="xs" wrap="nowrap">
                <TextInput
                  id={`starter-question-${i}`}
                  size="xs"
                  style={{ flex: 1 }}
                  value={q}
                  onChange={(e) => {
                    const updated = [...starterQuestions];
                    updated[i] = e.target.value;
                    setStarterQuestions(updated);
                  }}
                  placeholder={`Frage ${i + 1}`}
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => setStarterQuestions(starterQuestions.filter((_, idx) => idx !== i))}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            ))}
          </SimpleGrid>
        </Paper>
      </SimpleGrid>

      {/* Einbettung + Lead-Generierung */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper p="sm" withBorder>
          <Group gap="xs" mb="sm">
            <CodeIcon size={16} />
            <Text size="sm" fw={500}>Website-Einbettung</Text>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Stack gap="xs">
              <Switch
                id="widget-enabled"
                size="sm"
                label="Chat-Widget"
                description="Schwebendes Chat-Symbol"
                checked={widgetEnabled}
                onChange={(e) => setWidgetEnabled(e.currentTarget.checked)}
              />
              {widgetEnabled && (
                <>
                  <TextInput
                    id="widget-bubble-text"
                    size="xs"
                    label="Sprechblasen-Text"
                    value={widgetBubbleText}
                    onChange={(e) => setWidgetBubbleText(e.target.value)}
                    placeholder="Wie kann ich helfen?"
                    maxLength={150}
                  />
                  {allowEmbed ? (
                    <Group gap="xs">
                      <Code block style={{ flex: 1, fontSize: 10 }}>{widgetCode}</Code>
                      <CopyButton value={widgetCode}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? "Kopiert!" : "Kopieren"}>
                            <ActionIcon color={copied ? "teal" : "gray"} onClick={copy} variant="subtle">
                              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  ) : (
                    <Text size="xs" c="dimmed">
                      Embed-Code mit <Anchor component={Link} href="/dashboard/billing" size="xs">Upgrade</Anchor>
                    </Text>
                  )}
                </>
              )}
            </Stack>

            <Stack gap="xs">
              {allowEmbed ? (
                <>
                  <Switch
                    id="embed-enabled"
                    size="sm"
                    label="iFrame-Einbettung"
                    description="Chat in Webseite einbetten"
                    checked={embedEnabled}
                    onChange={(e) => setEmbedEnabled(e.currentTarget.checked)}
                  />
                  {embedEnabled && (
                    <Group gap="xs">
                      <Code block style={{ flex: 1, fontSize: 10 }}>{embedCode}</Code>
                      <CopyButton value={embedCode}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? "Kopiert!" : "Kopieren"}>
                            <ActionIcon color={copied ? "teal" : "gray"} onClick={copy} variant="subtle">
                              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  )}
                </>
              ) : (
                <Alert icon={<IconAlertTriangle size={16} />} color="yellow" p="xs">
                  <Text size="xs">
                    iFrame nur mit <Anchor component={Link} href="/dashboard/billing" size="xs">Upgrade</Anchor>
                  </Text>
                </Alert>
              )}
            </Stack>
          </SimpleGrid>
        </Paper>

        <Paper p="sm" withBorder>
          <Group gap="xs" mb="sm">
            <Users size={16} />
            <Text size="sm" fw={500}>Lead-Generierung</Text>
          </Group>
          <Stack gap="xs">
            <Switch
              id="lead-capture-enabled"
              size="sm"
              label="Kontaktformular"
              description="Bei fehlender Antwort"
              checked={leadCaptureEnabled}
              onChange={(e) => setLeadCaptureEnabled(e.currentTarget.checked)}
            />
            <Switch
              id="newsletter-enabled"
              size="sm"
              label="Newsletter"
              description="Nach 2 Min. Session"
              checked={newsletterEnabled}
              onChange={(e) => setNewsletterEnabled(e.currentTarget.checked)}
            />
            <Switch
              id="calendar-enabled"
              size="sm"
              label="Termin"
              description="Button oben im Chat + Widget bei Fragen nach Termin/Meeting"
              checked={calendarEnabled}
              onChange={(e) => setCalendarEnabled(e.currentTarget.checked)}
            />
            {calendarEnabled && (
              <TextInput
                id="calendar-link"
                size="xs"
                label={<Group gap={4}><Calendar size={12} /><span>Kalender-Link</span></Group>}
                value={calendarLink}
                onChange={(e) => setCalendarLink(e.target.value)}
                placeholder="https://calendar.app.google/..."
              />
            )}
          </Stack>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
