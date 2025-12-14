"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Paper,
  Text,
  TextInput,
  Select,
  Button,
  ActionIcon,
  Alert,
  Stack,
  Group,
  Loader,
  Anchor,
  Box,
} from "@mantine/core";
import {
  IconWorld,
  IconSearch,
  IconCheck,
  IconX,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ScrapedPage {
  id: string;
  chatId: string;
  url: string;
  title: string | null;
  displayName: string | null;
  fileSearchDocumentName: string | null;
  lastScrapedAt: Date;
  sitemapLastMod: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface WebsiteScraperProps {
  chatId: string;
  sitemapUrls: string[];
}

export function WebsiteScraper({ chatId, sitemapUrls }: WebsiteScraperProps) {
  const router = useRouter();
  const [pages, setPages] = useState<ScrapedPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScrapedPage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState(sitemapUrls[0] || "");
  const [sitemapInfo, setSitemapInfo] = useState<{
    valid: boolean;
    urlCount?: number;
    error?: string;
  } | null>(null);
  const [maxPages, setMaxPages] = useState("50");

  // Scraping progress
  const [scrapeProgress, setScrapeProgress] = useState<{
    status: string;
    current?: number;
    total?: number;
  } | null>(null);

  // Load scraped pages
  const loadPages = useCallback(async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}/scraped-pages`);
      if (response.ok) {
        const data = await response.json();
        setPages(data.pages || []);
      }
    } catch (error) {
      console.error("Error loading pages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  // Find sitemap from website URL
  const findSitemap = async () => {
    if (!websiteUrl) return;

    setIsChecking(true);
    setSitemapInfo(null);

    try {
      const response = await fetch(
        `/api/chats/${chatId}/scrape?action=findSitemap&websiteUrl=${encodeURIComponent(websiteUrl)}`
      );
      const data = await response.json();

      if (data.found) {
        setSitemapUrl(data.sitemapUrl);
        toast.success("Sitemap gefunden!");
        // Automatically check the sitemap
        checkSitemap(data.sitemapUrl);
      } else {
        toast.error("Keine Sitemap gefunden");
      }
    } catch (error) {
      console.error("Error finding sitemap:", error);
      toast.error("Fehler bei der Sitemap-Suche");
    } finally {
      setIsChecking(false);
    }
  };

  // Check sitemap URL
  const checkSitemap = async (url?: string) => {
    const urlToCheck = url || sitemapUrl;
    if (!urlToCheck) return;

    setIsChecking(true);
    setSitemapInfo(null);

    try {
      const response = await fetch(
        `/api/chats/${chatId}/scrape?action=checkSitemap&sitemapUrl=${encodeURIComponent(urlToCheck)}`
      );
      const data = await response.json();
      setSitemapInfo(data);

      if (data.valid) {
        toast.success(`${data.urlCount} URLs gefunden`);
      } else {
        toast.error(data.error || "Ungültige Sitemap");
      }
    } catch (error) {
      console.error("Error checking sitemap:", error);
      toast.error("Fehler beim Prüfen der Sitemap");
    } finally {
      setIsChecking(false);
    }
  };

  // Start scraping
  const startScraping = async () => {
    if (!sitemapUrl || !sitemapInfo?.valid) {
      toast.error("Bitte zuerst eine gültige Sitemap eingeben");
      return;
    }

    setIsScraping(true);
    setScrapeProgress({ status: "Scraping gestartet..." });

    try {
      const response = await fetch(`/api/chats/${chatId}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sitemapUrl,
          maxPages: Number(maxPages),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Scraping abgeschlossen: ${data.scrapedPages} von ${data.totalPages} Seiten erfolgreich`
        );
        loadPages();
        router.refresh();
      } else {
        throw new Error(data.error || "Scraping fehlgeschlagen");
      }
    } catch (error) {
      console.error("Scraping error:", error);
      toast.error(
        error instanceof Error ? error.message : "Scraping fehlgeschlagen"
      );
    } finally {
      setIsScraping(false);
      setScrapeProgress(null);
    }
  };

  // Delete scraped page
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/chats/${chatId}/scraped-pages?pageId=${deleteTarget.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Löschen fehlgeschlagen");
      }

      setPages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success("Seite wurde gelöscht");
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        error instanceof Error ? error.message : "Löschen fehlgeschlagen"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="lg" fw={600}>Website scrapen</Text>
        {pages.length > 0 && (
          <Text size="sm" c="dimmed">
            {pages.length} {pages.length === 1 ? "Seite" : "Seiten"} gescrapet
          </Text>
        )}
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Scrape eine Website via Sitemap, um den Inhalt für den Chatbot
        verfügbar zu machen
      </Text>

      {/* Form */}
      <Stack gap="sm" mb="lg">
        {/* Website URL Input */}
        <Group gap="xs" align="flex-end">
          <TextInput
            id="website-url"
            label="Website URL"
            placeholder="https://example.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            leftSection={<IconWorld size={16} />}
            disabled={isScraping}
            style={{ flex: 1 }}
          />
          <Button
            variant="light"
            onClick={findSitemap}
            disabled={!websiteUrl || isChecking || isScraping}
            loading={isChecking}
            leftSection={!isChecking && <IconSearch size={16} />}
          >
            Sitemap finden
          </Button>
        </Group>

        {/* Sitemap URL Input */}
        <Group gap="xs" align="flex-end">
          <TextInput
            id="sitemap-url"
            label="Sitemap URL"
            placeholder="https://example.com/sitemap.xml"
            value={sitemapUrl}
            onChange={(e) => {
              setSitemapUrl(e.target.value);
              setSitemapInfo(null);
            }}
            disabled={isScraping}
            style={{ flex: 1 }}
          />
          <Button
            variant="light"
            onClick={() => checkSitemap()}
            disabled={!sitemapUrl || isChecking || isScraping}
            loading={isChecking}
            leftSection={!isChecking && <IconCheck size={16} />}
          >
            Prüfen
          </Button>
        </Group>

        {/* Sitemap Info */}
        {sitemapInfo && (
          <Alert
            color={sitemapInfo.valid ? "green" : "red"}
            icon={sitemapInfo.valid ? <IconCheck size={16} /> : <IconX size={16} />}
          >
            {sitemapInfo.valid
              ? `${sitemapInfo.urlCount} URLs in der Sitemap gefunden`
              : sitemapInfo.error || "Ungültige Sitemap"}
          </Alert>
        )}

        {/* Max Pages */}
        <Select
          id="max-pages"
          label="Maximale Seitenanzahl"
          value={maxPages}
          onChange={(value) => setMaxPages(value || "50")}
          disabled={isScraping}
          data={[
            { value: "10", label: "10 Seiten" },
            { value: "25", label: "25 Seiten" },
            { value: "50", label: "50 Seiten" },
            { value: "100", label: "100 Seiten" },
            { value: "200", label: "200 Seiten" },
          ]}
          w={200}
        />

        {/* Start Button */}
        <Button
          fullWidth
          size="md"
          onClick={startScraping}
          disabled={!sitemapInfo?.valid || isScraping}
          loading={isScraping}
          leftSection={!isScraping && <IconWorld size={20} />}
        >
          {isScraping ? (scrapeProgress?.status || "Scraping läuft...") : "Scraping starten"}
        </Button>
      </Stack>

      {/* Scraped Pages List */}
      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : pages.length > 0 ? (
        <Stack gap="xs">
          <Text size="sm" fw={500} c="dimmed">Gescrapte Seiten</Text>
          <Box mah={400} style={{ overflowY: "auto" }}>
            <Stack gap="xs">
              {pages.map((page) => (
                <Paper key={page.id} p="sm" bg="gray.0" radius="md">
                  <Group justify="space-between" wrap="nowrap">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>
                        {page.title || page.displayName || "Ohne Titel"}
                      </Text>
                      <Anchor
                        href={page.url}
                        target="_blank"
                        size="xs"
                        style={{ display: "block" }}
                        truncate
                      >
                        {page.url}
                      </Anchor>
                      <Text size="xs" c="dimmed">
                        Gescrapt: {new Date(page.lastScrapedAt).toLocaleDateString("de-CH")}
                      </Text>
                    </Box>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        component="a"
                        href={page.url}
                        target="_blank"
                      >
                        <IconExternalLink size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => setDeleteTarget(page)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Stack>
      ) : (
        <Stack align="center" py="xl" c="dimmed">
          <IconWorld size={40} stroke={1.5} />
          <Text>Noch keine Seiten gescrapet</Text>
          <Text size="sm">Gib eine Website-URL ein, um zu beginnen</Text>
        </Stack>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Seite löschen?"
        description={`Die Seite "${deleteTarget?.title || deleteTarget?.url}" wird aus dem Chatbot entfernt.`}
        confirmLabel="Endgültig löschen"
        cancelLabel="Abbrechen"
        variant="danger"
        isLoading={isDeleting}
      />
    </Paper>
  );
}
