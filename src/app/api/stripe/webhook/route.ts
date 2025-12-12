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

      // Get period end from items (new Stripe API structure)
      const subData = subscription as unknown as {
        current_period_end?: number;
        items?: {
          data?: Array<{
            current_period_end?: number;
          }>;
        };
      };

      let periodEndTimestamp = subData.current_period_end;
      if (!periodEndTimestamp && subData.items?.data?.[0]?.current_period_end) {
        periodEndTimestamp = subData.items.data[0].current_period_end;
      }

      if (periodEndTimestamp) {
        currentPeriodEnd = new Date(periodEndTimestamp * 1000);
      }

      console.log("[Stripe Webhook] Extracted currentPeriodEnd:", currentPeriodEnd);
    } catch (err) {
      console.error("[Stripe Webhook] Failed to fetch subscription:", err);
    }
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

  // Get subscription data with proper typing for new Stripe API
  const subData = subscription as unknown as {
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    items?: {
      data?: Array<{
        current_period_end?: number;
        current_period_start?: number;
      }>;
    };
  };

  // Get current period end - check both locations (new API has it in items)
  let periodEndTimestamp = subData.current_period_end;
  if (!periodEndTimestamp && subData.items?.data?.[0]?.current_period_end) {
    periodEndTimestamp = subData.items.data[0].current_period_end;
  }

  const currentPeriodEnd = periodEndTimestamp
    ? new Date(periodEndTimestamp * 1000)
    : null;

  // Determine subscription status - check if canceling at period end
  let subscriptionStatus: string = subscription.status;
  if (subData.cancel_at_period_end && subscription.status === "active") {
    subscriptionStatus = "canceling";
  }

  const updateData: Record<string, unknown> = {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus,
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
    stripeStatus: subscription.status,
    ourStatus: subscriptionStatus,
    cancelAtPeriodEnd: subData.cancel_at_period_end,
    planId,
    currentPeriodEnd,
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
