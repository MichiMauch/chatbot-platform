"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Search,
  Loader2,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
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
  const [maxPages, setMaxPages] = useState(50);

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
          maxPages,
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
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Website scrapen</h2>
        {pages.length > 0 && (
          <span className="text-sm text-gray-500">
            {pages.length} {pages.length === 1 ? "Seite" : "Seiten"} gescrapet
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Scrape eine Website via Sitemap, um den Inhalt für den Chatbot
        verfügbar zu machen
      </p>

      {/* Website URL Input */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isScraping}
              />
            </div>
            <button
              onClick={findSitemap}
              disabled={!websiteUrl || isChecking || isScraping}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Sitemap finden
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sitemap URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={sitemapUrl}
              onChange={(e) => {
                setSitemapUrl(e.target.value);
                setSitemapInfo(null);
              }}
              placeholder="https://example.com/sitemap.xml"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isScraping}
            />
            <button
              onClick={() => checkSitemap()}
              disabled={!sitemapUrl || isChecking || isScraping}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Prüfen
            </button>
          </div>
        </div>

        {/* Sitemap Info */}
        {sitemapInfo && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 ${
              sitemapInfo.valid
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {sitemapInfo.valid ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>{sitemapInfo.urlCount} URLs in der Sitemap gefunden</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>{sitemapInfo.error || "Ungültige Sitemap"}</span>
              </>
            )}
          </div>
        )}

        {/* Max Pages */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximale Seitenanzahl
          </label>
          <select
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isScraping}
          >
            <option value={10}>10 Seiten</option>
            <option value={25}>25 Seiten</option>
            <option value={50}>50 Seiten</option>
            <option value={100}>100 Seiten</option>
            <option value={200}>200 Seiten</option>
          </select>
        </div>

        {/* Start Button */}
        <button
          onClick={startScraping}
          disabled={!sitemapInfo?.valid || isScraping}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {isScraping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {scrapeProgress?.status || "Scraping läuft..."}
            </>
          ) : (
            <>
              <Globe className="w-5 h-5" />
              Scraping starten
            </>
          )}
        </button>
      </div>

      {/* Scraped Pages List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : pages.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <h3 className="text-sm font-medium text-gray-700">
              Gescrapte Seiten
            </h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {page.title || page.displayName || "Ohne Titel"}
                  </p>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline truncate block"
                  >
                    {page.url}
                  </a>
                  <p className="text-xs text-gray-500">
                    Gescrapt:{" "}
                    {new Date(page.lastScrapedAt).toLocaleDateString("de-CH")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Öffnen"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setDeleteTarget(page)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Globe className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p>Noch keine Seiten gescrapet</p>
          <p className="text-sm">
            Gib eine Website-URL ein, um zu beginnen
          </p>
        </div>
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
    </section>
  );
}
