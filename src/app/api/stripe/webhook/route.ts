import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { teams } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { stripe, PLANS, PlanId } from "@/lib/stripe";
import Stripe from "stripe";

// Disable body parsing, we need the raw body for signature verification
export const runtime = "nodejs";

// POST /api/stripe/webhook - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  if (!stripe) {
    console.error("[Stripe Webhook] Stripe is not configured");
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("[Stripe Webhook] No signature provided");
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe Webhook] Webhook secret not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  console.log("[Stripe Webhook] Received event:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      default:
        console.log("[Stripe Webhook] Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[Stripe Webhook] Checkout completed:", session.id);

  const teamId = session.metadata?.teamId;
  const planId = session.metadata?.planId;

  if (!teamId || !planId) {
    console.error("[Stripe Webhook] Missing metadata in checkout session");
    return;
  }

  const plan = PLANS[planId as PlanId];
  if (!plan) {
    console.error("[Stripe Webhook] Invalid plan ID:", planId);
    return;
  }

  // Fetch subscription details to get period dates
  let currentPeriodEnd: Date | null = null;
  if (session.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      console.log("[Stripe Webhook] Subscription data:", JSON.stringify(subscription, null, 2));

      // Try multiple ways to get the period end
      const subAny = subscription as unknown as Record<string, unknown>;
      const periodEnd = subAny.current_period_end || subAny.currentPeriodEnd;

      if (typeof periodEnd === "number") {
        currentPeriodEnd = new Date(periodEnd * 1000);
      } else if (periodEnd instanceof Date) {
        currentPeriodEnd = periodEnd;
      }

      console.log("[Stripe Webhook] Extracted currentPeriodEnd:", currentPeriodEnd);
    } catch (err) {
      console.error("[Stripe Webhook] Failed to fetch subscription:", err);
    }
  } else {
    console.log("[Stripe Webhook] No subscription ID or stripe not configured:", {
      hasSubscription: !!session.subscription,
      hasStripe: !!stripe,
    });
  }

  // Update team with subscription info
  await db
    .update(teams)
    .set({
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      subscriptionStatus: "active",
      plan: planId,
      maxChats: plan.limits.maxChats,
      maxMessagesPerMonth: plan.limits.maxMessagesPerMonth,
      maxStorageMb: plan.limits.maxStorageMb,
      ...(currentPeriodEnd && { currentPeriodEnd }),
    })
    .where(eq(teams.id, teamId));

  console.log("[Stripe Webhook] Team updated after checkout:", {
    teamId,
    planId,
    subscriptionId: session.subscription,
    currentPeriodEnd,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[Stripe Webhook] Subscription updated:", subscription.id);

  const teamId = subscription.metadata?.teamId;
  if (!teamId) {
    // Try to find team by subscription ID
    const team = await db.query.teams.findFirst({
      where: eq(teams.stripeSubscriptionId, subscription.id),
    });
    if (!team) {
      console.error("[Stripe Webhook] Team not found for subscription:", subscription.id);
      return;
    }
    await updateTeamSubscription(team.id, subscription);
  } else {
    await updateTeamSubscription(teamId, subscription);
  }
}

async function updateTeamSubscription(teamId: string, subscription: Stripe.Subscription) {
  const planId = subscription.metadata?.planId;
  const plan = planId ? PLANS[planId as PlanId] : null;

  // Get current period end from subscription
  const currentPeriodEnd = "current_period_end" in subscription
    ? new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000)
    : null;

  const updateData: Record<string, unknown> = {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    ...(currentPeriodEnd && { currentPeriodEnd }),
  };

  // Update plan limits if plan is specified
  if (plan) {
    updateData.plan = planId;
    updateData.maxChats = plan.limits.maxChats;
    updateData.maxMessagesPerMonth = plan.limits.maxMessagesPerMonth;
    updateData.maxStorageMb = plan.limits.maxStorageMb;
  }

  await db.update(teams).set(updateData).where(eq(teams.id, teamId));

  console.log("[Stripe Webhook] Team subscription updated:", {
    teamId,
    status: subscription.status,
    planId,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[Stripe Webhook] Subscription deleted:", subscription.id);

  const teamId = subscription.metadata?.teamId;
  let team;

  if (teamId) {
    team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });
  } else {
    team = await db.query.teams.findFirst({
      where: eq(teams.stripeSubscriptionId, subscription.id),
    });
  }

  if (!team) {
    console.error("[Stripe Webhook] Team not found for deleted subscription");
    return;
  }

  // Downgrade to free plan
  const freePlan = PLANS.free;
  await db
    .update(teams)
    .set({
      plan: "free",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
      maxChats: freePlan.limits.maxChats,
      maxMessagesPerMonth: freePlan.limits.maxMessagesPerMonth,
      maxStorageMb: freePlan.limits.maxStorageMb,
    })
    .where(eq(teams.id, team.id));

  console.log("[Stripe Webhook] Team downgraded to free:", team.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[Stripe Webhook] Payment failed for invoice:", invoice.id);

  // Get subscription ID from invoice
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } };
  const subscriptionId = typeof invoiceData.subscription === "string"
    ? invoiceData.subscription
    : invoiceData.subscription?.id;
  if (!subscriptionId) return;

  const team = await db.query.teams.findFirst({
    where: eq(teams.stripeSubscriptionId, subscriptionId),
  });

  if (!team) {
    console.error("[Stripe Webhook] Team not found for failed payment");
    return;
  }

  // Update subscription status to past_due
  await db
    .update(teams)
    .set({
      subscriptionStatus: "past_due",
    })
    .where(eq(teams.id, team.id));

  console.log("[Stripe Webhook] Team marked as past_due:", team.id);

  // TODO: Send email notification to team owner about failed payment
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("[Stripe Webhook] Payment succeeded for invoice:", invoice.id);

  // Get subscription ID from invoice
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } };
  const subscriptionId = typeof invoiceData.subscription === "string"
    ? invoiceData.subscription
    : invoiceData.subscription?.id;
  if (!subscriptionId) return;

  const team = await db.query.teams.findFirst({
    where: eq(teams.stripeSubscriptionId, subscriptionId),
  });

  if (!team) {
    console.log("[Stripe Webhook] Team not found for successful payment (may be new subscription)");
    return;
  }

  // Ensure subscription status is active
  if (team.subscriptionStatus !== "active") {
    await db
      .update(teams)
      .set({
        subscriptionStatus: "active",
      })
      .where(eq(teams.id, team.id));

    console.log("[Stripe Webhook] Team reactivated after successful payment:", team.id);
  }
}
