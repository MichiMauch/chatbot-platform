import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamInvitations, teamMembers, teams } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireAuth, isErrorResponse } from "@/lib/rbac";

// GET /api/teams/invitations/[token] - Einladungs-Details laden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Load invitation with team info
    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.token, token),
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Einladung nicht gefunden" },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Diese Einladung ist abgelaufen" },
        { status: 410 }
      );
    }

    // Check if already used
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Diese Einladung wurde bereits verwendet" },
        { status: 410 }
      );
    }

    // Load team info
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, invitation.teamId),
    });

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        teamName: team?.name,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error loading invitation:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Einladung" },
      { status: 500 }
    );
  }
}

// POST /api/teams/invitations/[token] - Einladung annehmen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const result = await requireAuth();
    if (isErrorResponse(result)) return result;

    const { token } = await params;
    const { userId } = result;

    // Load invitation
    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.token, token),
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Einladung nicht gefunden" },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      await db
        .update(teamInvitations)
        .set({ status: "expired" })
        .where(eq(teamInvitations.id, invitation.id));

      return NextResponse.json(
        { error: "Diese Einladung ist abgelaufen" },
        { status: 410 }
      );
    }

    // Check if already used
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Diese Einladung wurde bereits verwendet" },
        { status: 410 }
      );
    }

    // Check if user is already in the team
    const existingMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, invitation.teamId),
        eq(teamMembers.userId, userId)
      ),
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "Du bist bereits Mitglied dieses Teams" },
        { status: 400 }
      );
    }

    // Add user to team
    await db.insert(teamMembers).values({
      id: nanoid(),
      teamId: invitation.teamId,
      userId,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.createdAt,
    });

    // Mark invitation as accepted
    await db
      .update(teamInvitations)
      .set({ status: "accepted" })
      .where(eq(teamInvitations.id, invitation.id));

    // Load team info for response
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, invitation.teamId),
    });

    return NextResponse.json({
      success: true,
      team: {
        id: team?.id,
        name: team?.name,
        slug: team?.slug,
      },
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Fehler beim Annehmen der Einladung" },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/invitations/[token] - Einladung löschen/widerrufen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const result = await requireAuth();
    if (isErrorResponse(result)) return result;

    const { token } = await params;
    const { teamId, isSuperAdmin } = result;

    // Load invitation
    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.token, token),
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Einladung nicht gefunden" },
        { status: 404 }
      );
    }

    // Check if user has access to this team's invitations
    if (!isSuperAdmin && invitation.teamId !== teamId) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    // Delete invitation
    await db.delete(teamInvitations).where(eq(teamInvitations.id, invitation.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Einladung" },
      { status: 500 }
    );
  }
}
