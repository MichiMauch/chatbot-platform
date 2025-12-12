"use client";

import { useState } from "react";
import { TrendingUp, X, CreditCard, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PlanUpgradeButtonProps {
  planId: string;
  planName: string;
  isCurrentPlan: boolean;
  currentPlan: string;
  isDowngrade?: boolean;
  isPopular?: boolean;
  requiresContact?: boolean;
}

export function PlanUpgradeButton({
  planId,
  planName,
  isCurrentPlan,
  currentPlan,
  isDowngrade = false,
  isPopular = false,
  requiresContact = false,
}: PlanUpgradeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingPeriod }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fehler beim Erstellen der Checkout-Session");
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  };

  // Current plan - disabled button
  if (isCurrentPlan) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Aktueller Plan
      </Button>
    );
  }

  // Free plan (downgrade) - disabled for now
  if (isDowngrade) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Downgrade
      </Button>
    );
  }

  // Enterprise - requires contact
  if (requiresContact) {
    return (
      <a href="mailto:kontakt@example.ch?subject=Enterprise%20Plan%20Anfrage">
        <Button variant="outline" className="w-full">
          <Mail className="w-4 h-4 mr-2" />
          Kontakt aufnehmen
        </Button>
      </a>
    );
  }

  return (
    <>
      <Button
        variant={isPopular ? "primary" : "outline"}
        className="w-full"
        onClick={() => setIsOpen(true)}
      >
        <TrendingUp className="w-4 h-4 mr-2" />
        Upgraden
      </Button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Auf {planName} upgraden
              </h2>
              <p className="text-gray-500 mt-2">
                Du wechselst von <span className="font-medium capitalize">{currentPlan}</span> auf{" "}
                <span className="font-medium">{planName}</span>.
              </p>
            </div>

            {/* Billing Period Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Abrechnungszeitraum
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBillingPeriod("monthly")}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    billingPeriod === "monthly"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-gray-900">Monatlich</div>
                  <div className="text-sm text-gray-500">Flexibel kündbar</div>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod("yearly")}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    billingPeriod === "yearly"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-gray-900">Jährlich</div>
                  <div className="text-sm text-green-600">2 Monate gratis</div>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <CreditCard className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">
                    Du wirst zu Stripe weitergeleitet, um deine Zahlungsdaten einzugeben.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
                disabled={loading}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleUpgrade}
                className="flex-1"
                isLoading={loading}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Zur Zahlung
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
