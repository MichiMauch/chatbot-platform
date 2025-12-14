import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { chats, scrapedPages, teams } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getPlan } from "@/lib/stripe";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "embed"; // "widget" or "embed"

    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, id),
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat nicht gefunden" },
        { status: 404 }
      );
    }

    // Chat must be public for embedding
    if (!chat.isPublic) {
      return NextResponse.json(
        { error: "Dieser Chat ist nicht öffentlich" },
        { status: 403 }
      );
    }

    // Check if the requested mode is enabled
    if (mode === "widget" && !chat.widgetEnabled) {
      return NextResponse.json(
        { error: "Widget ist für diesen Chat nicht aktiviert" },
        { status: 403 }
      );
    }

    if (mode === "embed" && !chat.embedEnabled) {
      return NextResponse.json(
        { error: "Embed ist für diesen Chat nicht aktiviert" },
        { status: 403 }
      );
    }

    // Load team for branding check (paid vs free)
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, chat.teamId),
    });

    const plan = getPlan(team?.plan || "free");
    const showPlatformBranding = !plan.limits.allowEmbed; // Free users show branding

    // Load scraped pages for this chat
    const scrapedPagesData = await db.query.scrapedPages.findMany({
      where: eq(scrapedPages.chatId, chat.id),
    });

    return NextResponse.json({
      chat: {
        id: chat.id,
        name: chat.name,
        displayName: chat.displayName,
        description: chat.description,
        themeColor: chat.themeColor,
        fileSearchStoreName: chat.fileSearchStoreName,
        systemInstruction: chat.systemInstruction,
        isPublic: chat.isPublic,
        files: chat.files,
        welcomeMessage: chat.welcomeMessage,
        chatLogo: chat.chatLogo,
        leadCaptureEnabled: chat.leadCaptureEnabled,
        leadCaptureTrigger: chat.leadCaptureTrigger,
        calendarLink: chat.calendarLink,
        newsletterEnabled: chat.newsletterEnabled,
        newsletterTrigger: chat.newsletterTrigger,
        starterQuestions: (() => {
          if (!chat.starterQuestions) return [];
          try {
            const parsed = JSON.parse(chat.starterQuestions);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
        scrapedPages: scrapedPagesData.map((p) => ({
          title: p.title,
          displayName: p.displayName,
          fileSearchDocumentName: p.fileSearchDocumentName,
          url: p.url,
        })),
      },
      showPlatformBranding,
      mode,
    });
  } catch (error) {
    console.error("Error loading embed chat:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Chats" },
      { status: 500 }
    );
  }
}
