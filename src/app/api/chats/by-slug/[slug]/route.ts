import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, scrapedPages, teamMembers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

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

    // Check access permissions
    let isPreview = false;

    if (!chat.isPublic) {
      // Check if user is logged in and is a team member
      const session = await auth();

      if (session?.user) {
        const membership = await db.query.teamMembers.findFirst({
          where: and(
            eq(teamMembers.userId, session.user.id),
            eq(teamMembers.teamId, chat.teamId)
          ),
        });

        if (membership) {
          // User is team member - allow preview
          isPreview = true;
        } else {
          return NextResponse.json(
            { error: "Dieser Chat ist nicht öffentlich" },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Dieser Chat ist nicht öffentlich" },
          { status: 403 }
        );
      }
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
        welcomeMessage: chat.welcomeMessage,
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
      isPreview,
    });
  } catch (error) {
    console.error("Error loading chat:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Chats" },
      { status: 500 }
    );
  }
}
