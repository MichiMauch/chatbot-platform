import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, teamMembers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

// PATCH /api/leads/[id] - Update lead status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify lead belongs to team
    const existingLead = await db.query.leads.findFirst({
      where: and(eq(leads.id, id), eq(leads.teamId, membership.teamId)),
    });

    if (!existingLead) {
      return NextResponse.json(
        { error: "Lead nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ["new", "contacted", "converted"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Ungültiger Status" },
        { status: 400 }
      );
    }

    // Update lead
    await db
      .update(leads)
      .set({ status })
      .where(eq(leads.id, id));

    console.log("[PATCH /api/leads] Lead updated:", { id, status });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/leads] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren" },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id] - Delete a lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify lead belongs to team and delete
    const result = await db
      .delete(leads)
      .where(and(eq(leads.id, id), eq(leads.teamId, membership.teamId)));

    console.log("[DELETE /api/leads] Lead deleted:", { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/leads] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen" },
      { status: 500 }
    );
  }
}
