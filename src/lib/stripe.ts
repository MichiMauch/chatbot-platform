import Stripe from "stripe";

// Initialize Stripe only when the secret key is available
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    })
  : null;

// Pricing Plans
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    description: "Perfekt zum Ausprobieren",
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      "1 Chatbot",
      "100 Nachrichten / Monat",
      "50 MB Speicher",
      "1 Benutzer",
      "Nur private Chats",
      "Community Support",
    ],
    limits: {
      maxChats: 1,
      maxMessagesPerMonth: 100,
      maxStorageMb: 50,
      maxMembers: 1,
      allowPublicChats: false,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "Für kleine Projekte",
    priceMonthly: 1900, // CHF 19
    priceYearly: 19000, // CHF 190 (2 Monate gratis)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
    features: [
      "5 Chatbots",
      "1'000 Nachrichten / Monat",
      "200 MB Speicher",
      "5 Benutzer",
      "Öffentliche Chats",
      "Community Support",
    ],
    limits: {
      maxChats: 5,
      maxMessagesPerMonth: 1000,
      maxStorageMb: 200,
      maxMembers: 5,
      allowPublicChats: true,
    },
    overage: {
      perMessage: 2, // CHF 0.02
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Für wachsende Teams",
    priceMonthly: 9900, // CHF 99
    priceYearly: 99000, // CHF 990
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    features: [
      "20 Chatbots",
      "10'000 Nachrichten / Monat",
      "500 MB Speicher",
      "10 Benutzer",
      "Öffentliche Chats",
      "E-Mail Support",
      "JSON Datenquelle",
    ],
    limits: {
      maxChats: 20,
      maxMessagesPerMonth: 10000,
      maxStorageMb: 500,
      maxMembers: 10,
      allowPublicChats: true,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Für grosse Unternehmen",
    priceMonthly: 29900, // Ab CHF 299
    priceYearly: 299000, // Ab CHF 2990
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    requiresContact: true, // Kann nicht direkt upgegraded werden
    features: [
      "Unbegrenzte Chatbots",
      "Unbegrenzte Nachrichten",
      "5 GB Speicher",
      "Unbegrenzte Benutzer",
      "Öffentliche Chats",
      "Dedizierter Support",
      "Custom Integrationen",
      "SLA Garantie",
    ],
    limits: {
      maxChats: -1, // Unlimited
      maxMessagesPerMonth: -1,
      maxStorageMb: 5000, // 5 GB
      maxMembers: -1, // Unlimited
      allowPublicChats: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanId];

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] || PLANS.free;
}

export function formatPrice(priceInCents: number): string {
  return `CHF ${(priceInCents / 100).toFixed(2)}`;
}
