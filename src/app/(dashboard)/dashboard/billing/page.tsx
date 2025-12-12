import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreditCard, Check, Zap } from "lucide-react";
import { PLANS, formatPrice } from "@/lib/stripe";
import { PlanUpgradeButton } from "./PlanUpgradeButton";
import { BillingPortalButton } from "./BillingPortalButton";
import { CancelSubscriptionButton } from "./CancelSubscriptionButton";
import { db } from "@/lib/db";
import { teams, teamMembers, chats, chatSessions, chatMessages } from "@/lib/schema";
import { eq, count, and, gte } from "drizzle-orm";
import { calculateStorageFromFiles } from "@/lib/admin-stats";

async function getTeamUsage(userId: string) {
  // Get team membership
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, userId),
  });

  if (!membership) {
    return null;
  }

  // Get team with limits
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, membership.teamId),
  });

  if (!team) {
    return null;
  }

  // Count chats
  const [chatCount] = await db
    .select({ count: count() })
    .from(chats)
    .where(eq(chats.teamId, team.id));

  // Get all team chats for storage calculation
  const teamChats = await db.query.chats.findMany({
    where: eq(chats.teamId, team.id),
  });

  // Calculate storage in MB
  const totalStorageBytes = teamChats.reduce(
    (sum, chat) => sum + calculateStorageFromFiles(chat.files),
    0
  );
  const totalStorageMb = Math.round(totalStorageBytes / (1024 * 1024) * 10) / 10;

  // Count messages this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let messageCount = 0;
  for (const chat of teamChats) {
    const sessions = await db.query.chatSessions.findMany({
      where: eq(chatSessions.chatId, chat.id),
    });

    for (const session of sessions) {
      const [msgCount] = await db
        .select({ count: count() })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.sessionId, session.id),
            eq(chatMessages.role, "user"),
            gte(chatMessages.createdAt, startOfMonth)
          )
        );
      messageCount += msgCount.count;
    }
  }

  return {
    team,
    usage: {
      chats: {
        used: chatCount.count,
        limit: team.maxChats ?? 1,
      },
      messages: {
        used: messageCount,
        limit: team.maxMessagesPerMonth ?? 100,
      },
      storage: {
        used: totalStorageMb,
        limit: team.maxStorageMb ?? 50,
      },
    },
  };
}

export default async function BillingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getTeamUsage(session.user.id);

  const currentPlan = data?.team?.plan || "free";
  const usage = data?.usage || {
    chats: { used: 0, limit: 1 },
    messages: { used: 0, limit: 100 },
    storage: { used: 0, limit: 50 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">
          Verwalte dein Abo und deine Nutzung
        </p>
      </div>

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Aktueller Plan</h2>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
              {currentPlan}
            </span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">
                {currentPlan === "free"
                  ? "Kostenlos"
                  : `${formatPrice(PLANS[currentPlan as keyof typeof PLANS]?.priceMonthly || 0)} / Monat`}
              </span>
            </div>
            {currentPlan !== "free" && (
              <>
                {data?.team?.currentPeriodEnd && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      Letzte Abrechnung: {(() => {
                        const lastBilling = new Date(data.team.currentPeriodEnd);
                        lastBilling.setMonth(lastBilling.getMonth() - 1);
                        return lastBilling.toLocaleDateString("de-CH");
                      })()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Nächste Abrechnung: {new Date(data.team.currentPeriodEnd).toLocaleDateString("de-CH")}
                    </p>
                  </div>
                )}
                {data?.team?.subscriptionStatus && (
                  <p className="text-sm text-gray-500">
                    Status: <span className={`font-medium ${
                      data.team.subscriptionStatus === "active"
                        ? "text-green-600"
                        : data.team.subscriptionStatus === "past_due"
                        ? "text-red-600"
                        : data.team.subscriptionStatus === "canceling"
                        ? "text-amber-600"
                        : "text-gray-600"
                    }`}>
                      {data.team.subscriptionStatus === "active" ? "Aktiv" :
                       data.team.subscriptionStatus === "past_due" ? "Zahlung ausstehend" :
                       data.team.subscriptionStatus === "canceled" ? "Gekündigt" :
                       data.team.subscriptionStatus === "canceling" ? "Wird gekündigt" :
                       data.team.subscriptionStatus}
                    </span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <BillingPortalButton hasSubscription={!!data?.team?.stripeSubscriptionId} />
                  <CancelSubscriptionButton
                    hasSubscription={!!data?.team?.stripeSubscriptionId}
                    currentPeriodEnd={data?.team?.currentPeriodEnd ?? null}
                    isCanceling={data?.team?.subscriptionStatus === "canceling"}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Usage Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Nutzung diesen Monat
          </h2>
          <div className="space-y-4">
            <UsageBar
              label="Chatbots"
              used={usage.chats.used}
              limit={usage.chats.limit}
            />
            <UsageBar
              label="Nachrichten"
              used={usage.messages.used}
              limit={usage.messages.limit}
            />
            <UsageBar
              label="Speicher (MB)"
              used={usage.storage.used}
              limit={usage.storage.limit}
            />
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Verfügbare Pläne
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(PLANS).map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentPlan === plan.id}
              currentPlan={currentPlan}
            />
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Rechnungen</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Noch keine Rechnungen vorhanden.</p>
        </div>
      </div>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const percentage = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  const isUnlimited = limit === -1;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900 font-medium">
          {typeof used === "number" && used % 1 !== 0
            ? used.toFixed(1)
            : used.toLocaleString("de-CH")} / {isUnlimited ? "∞" : limit.toLocaleString("de-CH")}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage > 80 ? "bg-red-500" : percentage > 60 ? "bg-yellow-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function PricingCard({
  plan,
  isCurrentPlan,
  currentPlan,
}: {
  plan: (typeof PLANS)[keyof typeof PLANS];
  isCurrentPlan: boolean;
  currentPlan: string;
}) {
  const isPopular = plan.id === "pro";
  const isDowngrade = plan.priceMonthly === 0;
  const requiresContact = "requiresContact" in plan && plan.requiresContact === true;

  return (
    <div
      className={`relative bg-white rounded-xl border p-6 ${
        isPopular
          ? "border-blue-500 ring-2 ring-blue-500"
          : "border-gray-200"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-blue-500 text-white">
            <Zap className="w-3 h-3 mr-1" />
            Beliebt
          </span>
        </div>
      )}

      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
        <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
      </div>

      <div className="text-center mb-6">
        <span className="text-3xl font-bold text-gray-900">
          {plan.priceMonthly === 0 ? "Gratis" : (
            <>
              {requiresContact && <span className="text-lg font-normal">Ab </span>}
              {formatPrice(plan.priceMonthly)}
            </>
          )}
        </span>
        {plan.priceMonthly > 0 && (
          <span className="text-gray-500 text-sm"> / Monat</span>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>

      <PlanUpgradeButton
        planId={plan.id}
        planName={plan.name}
        isCurrentPlan={isCurrentPlan}
        currentPlan={currentPlan}
        isDowngrade={isDowngrade}
        isPopular={isPopular}
        requiresContact={requiresContact}
      />
    </div>
  );
}
