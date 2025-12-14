import { NextResponse } from "next/server";

// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db, withRetry } from "@/lib/db";
import { chats, teamMembers, scrapedPages, scrapeHistory } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { requirePermission, isErrorResponse } from "@/lib/rbac";
import { createFileSearchStore, uploadToFileSearchStore } from "@/lib/gemini";
import { nanoid } from "nanoid";
import {
  findSitemapUrl,
  parseSitemapRecursive,
  scrapeMultiplePagesWithRetry,
  formatScrapedPageAsDocument,
  SitemapEntry,
} from "@/lib/scraper";

// POST /api/chats/[id]/scrape - Start scraping
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sitemapUrl: providedSitemapUrl, maxPages = 50 } = body;

    const result = await requirePermission("chats:edit");
    if (isErrorResponse(result)) return result;

    // Load chat
    const chat = await withRetry(() =>
      db.query.chats.findFirst({
        where: eq(chats.id, id),
      })
    );

    if (!chat) {
      return NextResponse.json(
        { error: "Chat nicht gefunden" },
        { status: 404 }
      );
    }

    // Check team membership
    const membership = await withRetry(() =>
      db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, result.userId),
      })
    );

    if (!membership || membership.teamId !== chat.teamId) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    // Find or use provided sitemap URL
    let sitemapUrl = providedSitemapUrl;
    if (!sitemapUrl) {
      return NextResponse.json(
        { error: "Sitemap URL erforderlich" },
        { status: 400 }
      );
    }

    // Create scrape history entry
    const historyId = nanoid();
    await withRetry(() =>
      db.insert(scrapeHistory).values({
        id: historyId,
        chatId: id,
        status: "running",
        startedAt: new Date(),
        createdAt: new Date(),
      })
    );

    try {
      // Parse sitemap
      console.log("[POST /api/scrape] Parsing sitemap:", sitemapUrl);
      let pages: SitemapEntry[] = [];
      try {
        pages = await parseSitemapRecursive(sitemapUrl);
      } catch (error) {
        console.error("[POST /api/scrape] Error parsing sitemap:", error);
        throw new Error("Sitemap konnte nicht gelesen werden");
      }

      if (pages.length === 0) {
        throw new Error("Keine URLs in Sitemap gefunden");
      }

      // Sort by date (newest first) and limit
      pages.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.getTime() - a.date.getTime();
      });

      const urlsToScrape = pages.slice(0, maxPages).map((p) => p.url);

      // Update history with total pages
      await withRetry(() =>
        db
          .update(scrapeHistory)
          .set({ totalPages: urlsToScrape.length })
          .where(eq(scrapeHistory.id, historyId))
      );

      // Create or get File Search Store
      let storeName = chat.fileSearchStoreName;
      if (!storeName) {
        console.log("[POST /api/scrape] Creating new file search store");
        const store = await createFileSearchStore(`chat-${chat.id}`);
        storeName = store.name!;

        await withRetry(() =>
          db
            .update(chats)
            .set({
              fileSearchStoreName: storeName,
              updatedAt: sql`(unixepoch())`,
            })
            .where(eq(chats.id, id))
        );
      }

      // Scrape pages
      console.log(
        `[POST /api/scrape] Starting scraping ${urlsToScrape.length} pages`
      );
      const results = await scrapeMultiplePagesWithRetry(
        urlsToScrape,
        3, // maxConcurrent
        1000, // delayMs
        3, // maxRetries
        (current, total, result) => {
          console.log(
            `[POST /api/scrape] [${current}/${total}] ${result.success ? "✓" : "✗"} ${result.url}`
          );
        }
      );

      // Process results
      let successCount = 0;
      let errorCount = 0;

      for (const result of results) {
        if (result.success && result.data) {
          try {
            // Format content as document
            const documentContent = formatScrapedPageAsDocument(result.data);

            // Create a file-like object for upload
            const file = new File(
              [documentContent],
              `${result.data.title || "page"}.txt`,
              { type: "text/plain" }
            );

            // Upload to Gemini
            const uploadResult = await uploadToFileSearchStore(storeName!, file);

            // Find sitemap date for this URL
            const sitemapEntry = pages.find((p) => p.url === result.url);

            // Save to database
            await withRetry(() =>
              db.insert(scrapedPages).values({
                id: nanoid(),
                chatId: id,
                url: result.url,
                title: result.data!.title,
                displayName: uploadResult.displayName,
                fileSearchDocumentName: uploadResult.documentName,
                ogImage: result.data!.ogImage,
                lastScrapedAt: new Date(),
                sitemapLastMod: sitemapEntry?.date,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
            );

            successCount++;
          } catch (error) {
            console.error(
              `[POST /api/scrape] Error uploading ${result.url}:`,
              error
            );
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }

      // Update sitemap URLs in chat
      const existingSitemapUrls: string[] = chat.sitemapUrls
        ? JSON.parse(chat.sitemapUrls)
        : [];
      if (!existingSitemapUrls.includes(sitemapUrl)) {
        existingSitemapUrls.push(sitemapUrl);
        await withRetry(() =>
          db
            .update(chats)
            .set({
              sitemapUrls: JSON.stringify(existingSitemapUrls),
              uploadType: "website",
              updatedAt: sql`(unixepoch())`,
            })
            .where(eq(chats.id, id))
        );
      }

      // Update history
      await withRetry(() =>
        db
          .update(scrapeHistory)
          .set({
            status: "completed",
            scrapedPagesCount: successCount,
            errorPagesCount: errorCount,
            completedAt: new Date(),
          })
          .where(eq(scrapeHistory.id, historyId))
      );

      console.log(
        `[POST /api/scrape] Completed: ${successCount} success, ${errorCount} errors`
      );

      return NextResponse.json({
        success: true,
        totalPages: urlsToScrape.length,
        scrapedPages: successCount,
        errorPages: errorCount,
      });
    } catch (error) {
      // Update history with error
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await withRetry(() =>
        db
          .update(scrapeHistory)
          .set({
            status: "failed",
            error: errorMessage,
            completedAt: new Date(),
          })
          .where(eq(scrapeHistory.id, historyId))
      );

      throw error;
    }
  } catch (error) {
    console.error("[POST /api/chats/scrape] Error:", error);
    const message =
      error instanceof Error ? error.message : "Fehler beim Scraping";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/chats/[id]/scrape - Check sitemap and get URL count
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const sitemapUrl = searchParams.get("sitemapUrl");
    const websiteUrl = searchParams.get("websiteUrl");

    const result = await requirePermission("chats:view");
    if (isErrorResponse(result)) return result;

    // Load chat
    const chat = await withRetry(() =>
      db.query.chats.findFirst({
        where: eq(chats.id, id),
      })
    );

    if (!chat) {
      return NextResponse.json(
        { error: "Chat nicht gefunden" },
        { status: 404 }
      );
    }

    // Check team membership
    const membership = await withRetry(() =>
      db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, result.userId),
      })
    );

    if (!membership || membership.teamId !== chat.teamId) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    // Find sitemap URL from website URL
    if (action === "findSitemap" && websiteUrl) {
      const foundSitemap = await findSitemapUrl(websiteUrl);
      return NextResponse.json({
        sitemapUrl: foundSitemap,
        found: !!foundSitemap,
      });
    }

    // Check sitemap and count URLs
    if (action === "checkSitemap" && sitemapUrl) {
      try {
        const pages = await parseSitemapRecursive(sitemapUrl);
        return NextResponse.json({
          valid: true,
          urlCount: pages.length,
          sampleUrls: pages.slice(0, 5).map((p) => ({
            url: p.url,
            date: p.date?.toISOString(),
          })),
        });
      } catch (error) {
        return NextResponse.json({
          valid: false,
          error: "Sitemap konnte nicht gelesen werden",
        });
      }
    }

    // Get scrape history
    const history = await withRetry(() =>
      db.query.scrapeHistory.findMany({
        where: eq(scrapeHistory.chatId, id),
        orderBy: (scrapeHistory, { desc }) => [desc(scrapeHistory.createdAt)],
        limit: 10,
      })
    );

    return NextResponse.json({ history });
  } catch (error) {
    console.error("[GET /api/chats/scrape] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden" },
      { status: 500 }
    );
  }
}
