import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teams, teamMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/rbac";
import { stripe } from "@/lib/stripe";

// POST /api/stripe/cancel - Cancel subscription at period end (no refund)
export async function POST() {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe ist nicht konfiguriert" },
        { status: 500 }
      );
    }

    const result = await requireAuth();
    if (isErrorResponse(result)) return result;

    const { userId } = result;

    // Get user's team
    const membership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, userId),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Kein Team gefunden" },
        { status: 404 }
      );
    }

    // Check if user is owner
    if (membership.role !== "owner") {
      return NextResponse.json(
        { error: "Nur der Team-Owner kann das Abo kündigen" },
        { status: 403 }
      );
    }

    // Get team
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, membership.teamId),
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team nicht gefunden" },
        { status: 404 }
      );
    }

    // Check if team has a subscription
    if (!team.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Kein aktives Abo vorhanden" },
        { status: 400 }
      );
    }

    // Cancel subscription at period end (no refund, keeps access until end)
    await stripe.subscriptions.update(team.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update team subscription status
    await db
      .update(teams)
      .set({
        subscriptionStatus: "canceling",
      })
      .where(eq(teams.id, team.id));

    console.log("[POST /api/stripe/cancel] Subscription canceled at period end:", {
      teamId: team.id,
      subscriptionId: team.stripeSubscriptionId,
    });

    return NextResponse.json({
      success: true,
      message: "Abo wird zum Ende der Laufzeit gekündigt",
    });
  } catch (error) {
    console.error("[POST /api/stripe/cancel] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Kündigen des Abos" },
      { status: 500 }
    );
  }
}
