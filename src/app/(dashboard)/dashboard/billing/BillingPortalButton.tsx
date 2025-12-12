"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BillingPortalButtonProps {
  hasSubscription: boolean;
}

export function BillingPortalButton({ hasSubscription }: BillingPortalButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleOpenPortal = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fehler beim Öffnen des Billing-Portals");
        return;
      }

      // Redirect to Stripe Billing Portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  };

  if (!hasSubscription) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={handleOpenPortal}
      disabled={loading}
    >
      <Settings className="w-4 h-4 mr-2" />
      {loading ? "Wird geladen..." : "Abo verwalten"}
    </Button>
  );
}
