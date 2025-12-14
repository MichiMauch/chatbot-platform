import { NextResponse } from "next/server";

// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { chats, teamMembers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ chat: null }, { status: 200 });
    }

    // Get user's team
    const membership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, session.user.id),
    });

    if (!membership) {
      return NextResponse.json({ chat: null }, { status: 200 });
    }

    // Find first chat with widgetEnabled = true
    const chat = await db.query.chats.findFirst({
      where: and(
        eq(chats.teamId, membership.teamId),
        eq(chats.widgetEnabled, true)
      ),
      columns: {
        id: true,
        themeColor: true,
        widgetBubbleText: true,
        chatLogo: true,
      },
    });

    return NextResponse.json({ chat: chat || null });
  } catch (error) {
    console.error("Error loading widget chat:", error);
    return NextResponse.json({ chat: null }, { status: 200 });
  }
}
