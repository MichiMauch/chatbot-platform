"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CancelSubscriptionButtonProps {
  hasSubscription: boolean;
  currentPeriodEnd: Date | null;
  isCanceling: boolean;
}

export function CancelSubscriptionButton({
  hasSubscription,
  currentPeriodEnd,
  isCanceling,
}: CancelSubscriptionButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/cancel", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fehler beim Kündigen");
        return;
      }

      toast.success("Abo wird zum Ende der Laufzeit gekündigt");
      setIsOpen(false);
      router.refresh();
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  };

  if (!hasSubscription) {
    return null;
  }

  // Already canceling
  if (isCanceling) {
    return (
      <p className="text-sm text-amber-600">
        Abo wird zum {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString("de-CH") : "Ende der Laufzeit"} gekündigt
      </p>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
      >
        Abo kündigen
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
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Abo wirklich kündigen?
              </h2>
              <p className="text-gray-500 mt-2">
                Dein Abo bleibt bis zum Ende der aktuellen Laufzeit aktiv.
              </p>
              {currentPeriodEnd && (
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  Zugang bis: {new Date(currentPeriodEnd).toLocaleDateString("de-CH")}
                </p>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                Nach der Kündigung wirst du auf den kostenlosen Plan zurückgestuft und verlierst Zugang zu Premium-Features.
              </p>
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
                onClick={handleCancel}
                className="flex-1 bg-red-600 hover:bg-red-700"
                isLoading={loading}
              >
                Ja, kündigen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
