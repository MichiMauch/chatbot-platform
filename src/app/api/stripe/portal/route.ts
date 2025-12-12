import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teams, teamMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/rbac";
import { stripe } from "@/lib/stripe";

// POST /api/stripe/portal - Create Stripe Customer Portal Session
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

    // Check if team has a Stripe customer ID
    if (!team.stripeCustomerId) {
      return NextResponse.json(
        { error: "Kein Stripe-Konto vorhanden. Bitte zuerst ein Abo abschliessen." },
        { status: 400 }
      );
    }

    // Create portal session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: team.stripeCustomerId,
      return_url: `${baseUrl}/dashboard/billing`,
    });

    console.log("[POST /api/stripe/portal] Portal session created:", {
      sessionId: portalSession.id,
      teamId: team.id,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error("[POST /api/stripe/portal] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Portal-Session" },
      { status: 500 }
    );
  }
}
