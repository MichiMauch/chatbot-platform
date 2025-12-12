import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers, chats, leads } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// POST /api/newsletter - Subscribe to newsletter (public, from chat)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chatId, email, name } = body;

    // Validate required fields
    if (!chatId || !email) {
      return NextResponse.json(
        { error: "chatId und email sind erforderlich" },
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

    // Check if email already subscribed for this team
    const existingSubscriber = await db.query.newsletterSubscribers.findFirst({
      where: eq(newsletterSubscribers.email, email.trim().toLowerCase()),
    });

    if (existingSubscriber && existingSubscriber.teamId === chat.teamId) {
      // Already subscribed, return success
      return NextResponse.json({
        success: true,
        message: "Bereits angemeldet"
      });
    }

    // Create newsletter subscriber
    const subscriberId = nanoid();
    await db.insert(newsletterSubscribers).values({
      id: subscriberId,
      teamId: chat.teamId,
      chatId,
      email: email.trim().toLowerCase(),
      name: name?.trim() || null,
    });

    // Also create a lead entry for tracking
    const leadId = nanoid();
    await db.insert(leads).values({
      id: leadId,
      chatId,
      teamId: chat.teamId,
      name: name?.trim() || email.split("@")[0],
      email: email.trim().toLowerCase(),
      source: "newsletter",
      status: "new",
    });

    console.log("[POST /api/newsletter] Subscriber created:", { subscriberId, email });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/newsletter] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Anmelden" },
      { status: 500 }
    );
  }
}
