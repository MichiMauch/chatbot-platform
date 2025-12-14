import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { teamInvitations, users, teamMembers, teams } from "@/lib/schema";
import { and, eq, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requirePermission, isErrorResponse } from "@/lib/rbac";
import { getPlan } from "@/lib/stripe";

// GET /api/teams/invitations - Liste offener Einladungen
export async function GET() {
  try {
    const result = await requirePermission("members:invite");
    if (isErrorResponse(result)) return result;

    const { teamId } = result;

    if (!teamId) {
      return NextResponse.json(
        { error: "Kein Team gefunden" },
        { status: 404 }
      );
    }

    // Load pending invitations
    const invitations = await db.query.teamInvitations.findMany({
      where: and(
        eq(teamInvitations.teamId, teamId),
        eq(teamInvitations.status, "pending")
      ),
      orderBy: (inv, { desc }) => [desc(inv.createdAt)],
    });

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Einladungen" },
      { status: 500 }
    );
  }
}

// POST /api/teams/invitations - Neue Einladung erstellen
export async function POST(request: NextRequest) {
  try {
    const result = await requirePermission("members:invite");
    if (isErrorResponse(result)) return result;

    const { teamId, userId } = result;
    const { email, role = "member" } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "Kein Team gefunden" },
        { status: 404 }
      );
    }

    // Validate email
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Gültige E-Mail-Adresse erforderlich" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Ungültige Rolle. Erlaubt: admin, member" },
        { status: 400 }
      );
    }

    // Check plan limits for team members
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team nicht gefunden" },
        { status: 404 }
      );
    }

    const plan = getPlan(team.plan || "free");
    const maxMembers = plan.limits.maxMembers;

    // Check if member limit is reached
    if (maxMembers !== -1) {
      const [memberCount] = await db
        .select({ count: count() })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));

      if (memberCount.count >= maxMembers) {
        return NextResponse.json(
          { error: "Mitglieder-Limit erreicht. Bitte upgraden Sie Ihren Plan." },
          { status: 403 }
        );
      }
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user already exists and is in the team
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingUser) {
      const existingMember = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, existingUser.id)
        ),
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "Dieser Benutzer ist bereits im Team" },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await db.query.teamInvitations.findFirst({
      where: and(
        eq(teamInvitations.teamId, teamId),
        eq(teamInvitations.email, normalizedEmail),
        eq(teamInvitations.status, "pending")
      ),
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Es existiert bereits eine offene Einladung für diese E-Mail" },
        { status: 400 }
      );
    }

    // Create invitation (expires in 7 days)
    const invitationId = nanoid();
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(teamInvitations).values({
      id: invitationId,
      teamId,
      email: normalizedEmail,
      role,
      token,
      invitedBy: userId,
      expiresAt,
      status: "pending",
    });

    // TODO: Send invitation email
    // For now, return the invitation link
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite/${token}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitationId,
        email: normalizedEmail,
        role,
        expiresAt,
        inviteUrl,
      },
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Einladung" },
      { status: 500 }
    );
  }
}
