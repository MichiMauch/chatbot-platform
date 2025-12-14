import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { teamMembers } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { requirePermission, isErrorResponse } from "@/lib/rbac";

// DELETE /api/teams/members/[userId] - Mitglied entfernen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const result = await requirePermission("members:remove");
    if (isErrorResponse(result)) return result;

    const { userId: targetUserId } = await params;
    const { teamId, userId: currentUserId } = result;

    if (!teamId) {
      return NextResponse.json(
        { error: "Kein Team gefunden" },
        { status: 404 }
      );
    }

    // Cannot remove yourself
    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: "Du kannst dich nicht selbst entfernen" },
        { status: 400 }
      );
    }

    // Check if target user is in the team
    const targetMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, targetUserId)
      ),
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Mitglied nicht im Team gefunden" },
        { status: 404 }
      );
    }

    // Cannot remove owner
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Der Owner kann nicht entfernt werden" },
        { status: 403 }
      );
    }

    // Remove member
    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, targetUserId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Fehler beim Entfernen des Mitglieds" },
      { status: 500 }
    );
  }
}
