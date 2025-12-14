import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { chats, teamMembers, teams } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requirePermission, isErrorResponse } from "@/lib/rbac";
import { deleteFileSearchStore } from "@/lib/gemini";
import { getPlan } from "@/lib/stripe";
import fs from "fs";
import path from "path";

// DELETE /api/chats/[id] - Chat löschen
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Nur owner und admin dürfen Chats löschen
    const result = await requirePermission("chats:delete");
    if (isErrorResponse(result)) return result;

    // Chat laden und prüfen ob er zum Team gehört
    const chat = await withRetry(() =>
      db.query.chats.findFirst({
        where: eq(chats.id, id),
      })
    );

    if (!chat) {
      return NextResponse.json({ error: "Chat nicht gefunden" }, { status: 404 });
    }

    // Team-Membership prüfen
    const membership = await withRetry(() =>
      db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, result.userId),
      })
    );

    if (!membership || membership.teamId !== chat.teamId) {
      return NextResponse.json(
        { error: "Keine Berechtigung für diesen Chat" },
        { status: 403 }
      );
    }

    // File Search Store löschen (falls vorhanden)
    if (chat.fileSearchStoreName) {
      try {
        await deleteFileSearchStore(chat.fileSearchStoreName);
        console.log("[DELETE /api/chats] File Search Store deleted:", chat.fileSearchStoreName);
      } catch (error) {
        console.error("[DELETE /api/chats] Error deleting File Search Store:", error);
        // Weitermachen auch wenn Store-Löschung fehlschlägt
      }
    }

    // Uploads-Ordner löschen (falls vorhanden)
    const uploadsDir = path.join(process.cwd(), "uploads", id);
    if (fs.existsSync(uploadsDir)) {
      try {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
        console.log("[DELETE /api/chats] Uploads folder deleted:", uploadsDir);
      } catch (error) {
        console.error("[DELETE /api/chats] Error deleting uploads folder:", error);
        // Weitermachen auch wenn Ordner-Löschung fehlschlägt
      }
    }

    // Chat löschen
    await withRetry(() => db.delete(chats).where(eq(chats.id, id)));

    console.log("[DELETE /api/chats] Chat deleted:", { id, name: chat.name });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/chats] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Chats" },
      { status: 500 }
    );
  }
}

// GET /api/chats/[id] - Einzelnen Chat laden
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await requirePermission("chats:view");
    if (isErrorResponse(result)) return result;

    const chat = await withRetry(() =>
      db.query.chats.findFirst({
        where: eq(chats.id, id),
      })
    );

    if (!chat) {
      return NextResponse.json({ error: "Chat nicht gefunden" }, { status: 404 });
    }

    // Team-Membership prüfen
    const membership = await withRetry(() =>
      db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, result.userId),
      })
    );

    if (!membership || membership.teamId !== chat.teamId) {
      return NextResponse.json(
        { error: "Keine Berechtigung für diesen Chat" },
        { status: 403 }
      );
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error("[GET /api/chats/[id]] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Chats" },
      { status: 500 }
    );
  }
}

// PATCH /api/chats/[id] - Chat-Einstellungen aktualisieren
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Nur owner und admin dürfen Chats bearbeiten
    const result = await requirePermission("chats:edit");
    if (isErrorResponse(result)) return result;

    // Chat laden und prüfen ob er zum Team gehört
    const chat = await withRetry(() =>
      db.query.chats.findFirst({
        where: eq(chats.id, id),
      })
    );

    if (!chat) {
      return NextResponse.json({ error: "Chat nicht gefunden" }, { status: 404 });
    }

    // Team-Membership prüfen
    const membership = await withRetry(() =>
      db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, result.userId),
      })
    );

    if (!membership || membership.teamId !== chat.teamId) {
      return NextResponse.json(
        { error: "Keine Berechtigung für diesen Chat" },
        { status: 403 }
      );
    }

    // Update-Daten aus Request
    const body = await request.json();
    const {
      displayName,
      description,
      themeColor,
      systemInstruction,
      isPublic,
      allowAnonymous,
      uploadType,
      starterQuestions,
      welcomeMessage,
      chatLogo,
      leadCaptureEnabled,
      leadCaptureTrigger,
      calendarLink,
      newsletterEnabled,
      newsletterTrigger,
      widgetEnabled,
      embedEnabled,
      widgetBubbleText,
    } = body;

    // Load team for plan checks
    const team = await withRetry(() =>
      db.query.teams.findFirst({
        where: eq(teams.id, chat.teamId),
      })
    );
    const plan = getPlan(team?.plan || "free");

    // Check plan limits for public chats
    if (isPublic === true || allowAnonymous === true) {
      if (!plan.limits.allowPublicChats) {
        return NextResponse.json(
          { error: "Öffentliche Chats sind in Ihrem Plan nicht verfügbar. Bitte upgraden Sie." },
          { status: 403 }
        );
      }
    }

    // Check plan limits for embed
    if (embedEnabled === true) {
      if (!plan.limits.allowEmbed) {
        return NextResponse.json(
          { error: "Embed ist in Ihrem Plan nicht verfügbar. Bitte upgraden Sie." },
          { status: 403 }
        );
      }
    }

    // Validierung
    if (displayName !== undefined && !displayName.trim()) {
      return NextResponse.json(
        { error: "Anzeigename darf nicht leer sein" },
        { status: 400 }
      );
    }

    // Nur erlaubte Felder aktualisieren
    const updateData: Partial<typeof chats.$inferInsert> = {};
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (themeColor !== undefined) updateData.themeColor = themeColor;
    if (systemInstruction !== undefined) updateData.systemInstruction = systemInstruction?.trim() || null;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (allowAnonymous !== undefined) updateData.allowAnonymous = allowAnonymous;
    if (uploadType !== undefined) updateData.uploadType = uploadType;
    if (starterQuestions !== undefined) updateData.starterQuestions = starterQuestions;
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
    if (chatLogo !== undefined) updateData.chatLogo = chatLogo;
    if (leadCaptureEnabled !== undefined) updateData.leadCaptureEnabled = leadCaptureEnabled;
    if (leadCaptureTrigger !== undefined) updateData.leadCaptureTrigger = leadCaptureTrigger;
    if (calendarLink !== undefined) updateData.calendarLink = calendarLink?.trim() || null;
    if (newsletterEnabled !== undefined) updateData.newsletterEnabled = newsletterEnabled;
    if (newsletterTrigger !== undefined) updateData.newsletterTrigger = newsletterTrigger;
    if (widgetEnabled !== undefined) updateData.widgetEnabled = widgetEnabled;
    if (embedEnabled !== undefined) updateData.embedEnabled = embedEnabled;
    if (widgetBubbleText !== undefined) updateData.widgetBubbleText = widgetBubbleText?.trim() || null;

    // Immer updatedAt aktualisieren
    await withRetry(() =>
      db
        .update(chats)
        .set({
          ...updateData,
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(chats.id, id))
    );

    // Aktualisierten Chat laden
    const updatedChat = await withRetry(() =>
      db.query.chats.findFirst({
        where: eq(chats.id, id),
      })
    );

    console.log("[PATCH /api/chats] Chat updated:", { id, fields: Object.keys(updateData) });
    return NextResponse.json({ chat: updatedChat });
  } catch (error) {
    console.error("[PATCH /api/chats] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Chats" },
      { status: 500 }
    );
  }
}
