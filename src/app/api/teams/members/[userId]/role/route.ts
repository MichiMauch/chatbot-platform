import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { requirePermission, isErrorResponse } from "@/lib/rbac";

// PATCH /api/teams/members/[userId]/role - Rolle ändern
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const result = await requirePermission("members:change-role");
    if (isErrorResponse(result)) return result;

    const { userId: targetUserId } = await params;
    const { teamId, userId: currentUserId } = result;
    const { role } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "Kein Team gefunden" },
        { status: 404 }
      );
    }

    // Validate role
    if (!["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Ungültige Rolle. Erlaubt: admin, member" },
        { status: 400 }
      );
    }

    // Cannot change your own role
    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: "Du kannst deine eigene Rolle nicht ändern" },
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

    // Cannot change owner's role
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Die Owner-Rolle kann nicht geändert werden" },
        { status: 403 }
      );
    }

    // Update role
    await db
      .update(teamMembers)
      .set({ role })
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, targetUserId)
        )
      );

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Error changing role:", error);
    return NextResponse.json(
      { error: "Fehler beim Ändern der Rolle" },
      { status: 500 }
    );
  }
}
