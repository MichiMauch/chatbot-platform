import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { chats, teamMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  requireAuth,
  requirePermission,
  isErrorResponse,
} from "@/lib/rbac";
import { getPlan } from "@/lib/stripe";

// GET /api/chats - Liste aller Chats des Teams
export async function GET() {
  try {
    const result = await requireAuth();
    if (isErrorResponse(result)) return result;

    const { userId, teamId, isSuperAdmin: isAdmin } = result;

    // Super Admin: Alle Chats laden
    if (isAdmin) {
      const allChats = await withRetry(() =>
        db.query.chats.findMany({
          orderBy: (chats, { desc }) => [desc(chats.createdAt)],
          with: { team: true },
        })
      );
      return NextResponse.json({ chats: allChats });
    }

    // Team-ID des Users holen falls nicht in Session
    let effectiveTeamId = teamId;
    if (!effectiveTeamId) {
      const membership = await withRetry(() =>
        db.query.teamMembers.findFirst({
          where: eq(teamMembers.userId, userId),
        })
      );
      effectiveTeamId = membership?.teamId;
    }

    if (!effectiveTeamId) {
      return NextResponse.json({ error: "Kein Team gefunden" }, { status: 404 });
    }

    // Alle Chats des Teams laden
    const teamChats = await withRetry(() =>
      db.query.chats.findMany({
        where: eq(chats.teamId, effectiveTeamId),
        orderBy: (chats, { desc }) => [desc(chats.createdAt)],
      })
    );

    return NextResponse.json({ chats: teamChats });
  } catch (error) {
    console.error("[GET /api/chats] Error fetching chats:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Chats" },
      { status: 500 }
    );
  }
}

// POST /api/chats - Neuen Chat erstellen
export async function POST(request: Request) {
  try {
    // Nur owner und admin dürfen Chats erstellen
    const result = await requirePermission("chats:create");
    if (isErrorResponse(result)) return result;

    const body = await request.json();
    const { name, displayName, description } = body;

    console.log("[POST /api/chats] Request body:", { name, displayName, description });

    // Validierung
    if (!name || !displayName) {
      console.log("[POST /api/chats] Validation failed: missing name or displayName", { name, displayName });
      return NextResponse.json(
        { error: "Name und Anzeigename sind erforderlich" },
        { status: 400 }
      );
    }

    // URL-Name validieren
    if (!/^[a-z0-9-]+$/.test(name)) {
      console.log("[POST /api/chats] Validation failed: invalid URL name", { name });
      return NextResponse.json(
        { error: "URL-Name darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten" },
        { status: 400 }
      );
    }

    // Team-ID des Users holen
    const membership = await withRetry(() =>
      db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, result.userId),
        with: { team: true },
      })
    );

    if (!membership) {
      console.log("[POST /api/chats] No team membership found for user:", result.userId);
      return NextResponse.json({ error: "Kein Team gefunden" }, { status: 404 });
    }

    // Prüfen ob Chat-Name bereits existiert (global unique)
    const existingChat = await withRetry(() =>
      db.query.chats.findFirst({
        where: eq(chats.name, name),
      })
    );

    if (existingChat) {
      console.log("[POST /api/chats] URL name already exists:", name);
      return NextResponse.json(
        { error: "Dieser URL-Name ist bereits vergeben" },
        { status: 400 }
      );
    }

    // Prüfen ob Team Chat-Limit erreicht hat
    const teamChats = await withRetry(() =>
      db.query.chats.findMany({
        where: eq(chats.teamId, membership.teamId),
      })
    );

    const maxChats = membership.team.maxChats ?? 1;
    if (maxChats !== -1 && teamChats.length >= maxChats) {
      console.log("[POST /api/chats] Chat limit reached:", { current: teamChats.length, max: maxChats });
      return NextResponse.json(
        { error: `Chat-Limit erreicht (${maxChats}). Bitte upgrade deinen Plan.` },
        { status: 403 }
      );
    }

    // Get plan to check if public chats are allowed
    const plan = getPlan(membership.team.plan || "free");
    const allowPublicChats = plan.limits.allowPublicChats;

    // Chat erstellen
    const chatId = nanoid();
    await withRetry(() =>
      db.insert(chats).values({
        id: chatId,
        teamId: membership.teamId,
        name,
        displayName,
        description: description || null,
        createdById: result.userId,
        // Free plan: chats are private only
        isPublic: allowPublicChats,
        allowAnonymous: allowPublicChats,
      })
    );

    console.log("[POST /api/chats] Chat created successfully:", { id: chatId, name });
    return NextResponse.json({ id: chatId, name });
  } catch (error) {
    console.error("[POST /api/chats] Error creating chat:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Chats" },
      { status: 500 }
    );
  }
}
