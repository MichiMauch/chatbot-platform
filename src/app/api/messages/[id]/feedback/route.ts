import { NextResponse } from "next/server";

// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { chatMessages } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { feedback } = body;

    // Validate feedback value
    if (feedback !== -1 && feedback !== 0 && feedback !== 1) {
      return NextResponse.json(
        { error: "Ungültiger Feedback-Wert" },
        { status: 400 }
      );
    }

    // Update the message with the feedback
    await db
      .update(chatMessages)
      .set({ feedback })
      .where(eq(chatMessages.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/messages/[id]/feedback] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern des Feedbacks" },
      { status: 500 }
    );
  }
}
