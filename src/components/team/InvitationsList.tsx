"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

interface Props {
  invitations: Invitation[];
}

export function InvitationsList({ invitations }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCancelInvitation = async (token: string) => {
    if (!confirm("Möchtest du diese Einladung wirklich widerrufen?")) return;

    setLoading(token);
    try {
      const response = await fetch(`/api/teams/invitations/${token}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Fehler beim Widerrufen");
        return;
      }

      router.refresh();
    } catch {
      alert("Fehler beim Widerrufen");
    } finally {
      setLoading(null);
    }
  };

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const roleLabels = {
    admin: "Admin",
    member: "Mitglied",
  };

  return (
    <div className="divide-y divide-gray-200">
      {invitations.map((invitation) => {
        const isLoading = loading === invitation.token;
        const isCopied = copied === invitation.token;
        const isExpired = new Date() > new Date(invitation.expiresAt);

        return (
          <div
            key={invitation.id}
            className="flex items-center justify-between px-6 py-4"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{invitation.email}</p>
                <p className="text-sm text-gray-500">
                  {isExpired ? (
                    <span className="text-red-500">Abgelaufen</span>
                  ) : (
                    <>
                      Läuft ab:{" "}
                      {new Date(invitation.expiresAt).toLocaleDateString(
                        "de-CH"
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                {roleLabels[invitation.role as keyof typeof roleLabels] ||
                  invitation.role}
              </span>

              {!isExpired && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyLink(invitation.token)}
                  title="Link kopieren"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelInvitation(invitation.token)}
                disabled={isLoading}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}

      {invitations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Keine ausstehenden Einladungen
        </div>
      )}
    </div>
  );
}
