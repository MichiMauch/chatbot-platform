import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teams, teamMembers, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/rbac";
import { stripe, PLANS, PlanId } from "@/lib/stripe";

// POST /api/stripe/checkout - Create Stripe Checkout Session
export async function POST(request: NextRequest) {
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
    const { planId, billingPeriod = "monthly" } = await request.json();

    // Validate plan
    if (!planId || !PLANS[planId as PlanId]) {
      return NextResponse.json(
        { error: "Ungültiger Plan" },
        { status: 400 }
      );
    }

    const plan = PLANS[planId as PlanId];

    // Get price ID based on billing period
    const priceId = billingPeriod === "yearly"
      ? plan.stripePriceIdYearly
      : plan.stripePriceIdMonthly;

    if (!priceId) {
      return NextResponse.json(
        { error: "Kein Stripe Price für diesen Plan konfiguriert" },
        { status: 400 }
      );
    }

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
        { error: "Nur der Team-Owner kann das Abo ändern" },
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

    // Get user email for Stripe customer
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User nicht gefunden" },
        { status: 404 }
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = team.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: team.name,
        metadata: {
          teamId: team.id,
          userId: userId,
        },
      });
      stripeCustomerId = customer.id;

      // Save customer ID to team
      await db
        .update(teams)
        .set({ stripeCustomerId })
        .where(eq(teams.id, team.id));
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/billing?canceled=true`,
      metadata: {
        teamId: team.id,
        planId: planId,
      },
      subscription_data: {
        metadata: {
          teamId: team.id,
          planId: planId,
        },
      },
    });

    console.log("[POST /api/stripe/checkout] Session created:", {
      sessionId: session.id,
      teamId: team.id,
      planId,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[POST /api/stripe/checkout] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Checkout-Session" },
      { status: 500 }
    );
  }
}
