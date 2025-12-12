import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, scrapedPages } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const chat = await db.query.chats.findFirst({
      where: eq(chats.name, slug),
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat nicht gefunden" },
        { status: 404 }
      );
    }

    // Only return public chats
    if (!chat.isPublic) {
      return NextResponse.json(
        { error: "Dieser Chat ist nicht öffentlich" },
        { status: 403 }
      );
    }

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
        scrapedPages: scrapedPagesData.map((p) => ({
          title: p.title,
          displayName: p.displayName,
          fileSearchDocumentName: p.fileSearchDocumentName,
          url: p.url,
        })),
      },
    });
  } catch (error) {
    console.error("Error loading chat:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Chats" },
      { status: 500 }
    );
  }
}
