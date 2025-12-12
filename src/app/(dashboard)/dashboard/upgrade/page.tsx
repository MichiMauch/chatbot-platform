import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Check, Zap } from "lucide-react";
import { PLANS, formatPrice } from "@/lib/stripe";
import { PlanUpgradeButton } from "../billing/PlanUpgradeButton";
import { db } from "@/lib/db";
import { teams, teamMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function getCurrentPlan(userId: string) {
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, userId),
  });

  if (!membership) {
    return "free";
  }

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, membership.teamId),
  });

  return team?.plan || "free";
}

export default async function UpgradePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const currentPlan = await getCurrentPlan(session.user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upgrade</h1>
          <p className="text-gray-500 mt-1">
            Wähle den passenden Plan für dein Team
          </p>
        </div>
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
          Aktuell: {currentPlan}
        </span>
      </div>

      {/* Paid Plans - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.values(PLANS)
          .filter((plan) => plan.id !== "free")
          .map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentPlan === plan.id}
              currentPlan={currentPlan}
            />
          ))}
      </div>

      {/* Free Plan - Full width, compact */}
      <FreePlanCard
        isCurrentPlan={currentPlan === "free"}
        currentPlan={currentPlan}
      />
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

function FreePlanCard({
  isCurrentPlan,
  currentPlan,
}: {
  isCurrentPlan: boolean;
  currentPlan: string;
}) {
  const plan = PLANS.free;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Plan Info */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900">{plan.name}</h3>
              {isCurrentPlan && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                  Aktuell
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{plan.description}</p>
          </div>
        </div>

        {/* Features - horizontal on larger screens */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
          {plan.features.slice(0, 4).map((feature, index) => (
            <span key={index} className="flex items-center">
              <Check className="w-3.5 h-3.5 text-green-500 mr-1.5" />
              {feature}
            </span>
          ))}
        </div>

        {/* Price & Button */}
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-gray-900">Gratis</span>
          {!isCurrentPlan && currentPlan !== "free" && (
            <span className="text-sm text-gray-500">
              (Downgrade nicht möglich)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
