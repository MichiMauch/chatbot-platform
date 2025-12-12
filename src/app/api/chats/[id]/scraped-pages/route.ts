import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { chats, teamMembers, scrapedPages } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { requirePermission, isErrorResponse } from "@/lib/rbac";
import { deleteFileSearchStoreDocument } from "@/lib/gemini";

// GET /api/chats/[id]/scraped-pages - List scraped pages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Get scraped pages
    const pages = await withRetry(() =>
      db.query.scrapedPages.findMany({
        where: eq(scrapedPages.chatId, id),
        orderBy: (scrapedPages, { desc }) => [desc(scrapedPages.lastScrapedAt)],
      })
    );

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("[GET /api/chats/scraped-pages] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der gescrapten Seiten" },
      { status: 500 }
    );
  }
}

// DELETE /api/chats/[id]/scraped-pages - Delete a scraped page
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json(
        { error: "pageId fehlt" },
        { status: 400 }
      );
    }

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

    // Get the scraped page
    const page = await withRetry(() =>
      db.query.scrapedPages.findFirst({
        where: eq(scrapedPages.id, pageId),
      })
    );

    if (!page || page.chatId !== id) {
      return NextResponse.json(
        { error: "Seite nicht gefunden" },
        { status: 404 }
      );
    }

    // Delete from Gemini File Search Store
    if (chat.fileSearchStoreName && page.fileSearchDocumentName) {
      try {
        await deleteFileSearchStoreDocument(
          chat.fileSearchStoreName,
          page.fileSearchDocumentName
        );
        console.log(
          "[DELETE /api/scraped-pages] Deleted from Gemini:",
          page.fileSearchDocumentName
        );
      } catch (error) {
        console.error(
          "[DELETE /api/scraped-pages] Error deleting from Gemini:",
          error
        );
        // Continue anyway - we still want to delete from DB
      }
    }

    // Delete from database
    await withRetry(() =>
      db.delete(scrapedPages).where(eq(scrapedPages.id, pageId))
    );

    console.log("[DELETE /api/scraped-pages] Deleted page:", page.url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/chats/scraped-pages] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen" },
      { status: 500 }
    );
  }
}
