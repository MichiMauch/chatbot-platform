import { NextResponse } from "next/server";

// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { teamMembers, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/rbac";

// GET /api/teams/members - Liste aller Team-Mitglieder
export async function GET() {
  try {
    const result = await requireAuth();
    if (isErrorResponse(result)) return result;

    const { teamId, isSuperAdmin } = result;

    if (!teamId && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Kein Team gefunden" },
        { status: 404 }
      );
    }

    // Load team members with user info
    const members = await db.query.teamMembers.findMany({
      where: teamId ? eq(teamMembers.teamId, teamId) : undefined,
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: (teamMembers, { asc }) => [asc(teamMembers.joinedAt)],
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Team-Mitglieder" },
      { status: 500 }
    );
  }
}
