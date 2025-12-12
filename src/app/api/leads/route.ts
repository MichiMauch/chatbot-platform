import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, chats, teamMembers } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";

// POST /api/leads - Create a new lead (public, from chat)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chatId, name, email, phone, message, source, sessionId } = body;

    // Validate required fields
    if (!chatId || !name || !email || !source) {
      return NextResponse.json(
        { error: "chatId, name, email und source sind erforderlich" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Ungültige E-Mail-Adresse" },
        { status: 400 }
      );
    }

    // Load chat to get teamId
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat nicht gefunden" },
        { status: 404 }
      );
    }

    // Create lead
    const leadId = nanoid();
    await db.insert(leads).values({
      id: leadId,
      chatId,
      teamId: chat.teamId,
      sessionId: sessionId || null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      message: message?.trim() || null,
      source,
      status: "new",
    });

    console.log("[POST /api/leads] Lead created:", { leadId, chatId, email });

    return NextResponse.json({ success: true, leadId });
  } catch (error) {
    console.error("[POST /api/leads] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern" },
      { status: 500 }
    );
  }
}

// GET /api/leads - Get all leads for the team (authenticated)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    // Get user's team
    const membership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, session.user.id),
    });

    if (!membership) {
      return NextResponse.json({ error: "Kein Team gefunden" }, { status: 403 });
    }

    // Get all leads for the team with chat info
    const teamLeads = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        message: leads.message,
        source: leads.source,
        status: leads.status,
        createdAt: leads.createdAt,
        chatId: leads.chatId,
        chatName: chats.displayName,
      })
      .from(leads)
      .leftJoin(chats, eq(leads.chatId, chats.id))
      .where(eq(leads.teamId, membership.teamId))
      .orderBy(desc(leads.createdAt));

    return NextResponse.json({ leads: teamLeads });
  } catch (error) {
    console.error("[GET /api/leads] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Leads" },
      { status: 500 }
    );
  }
}
