"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteButton({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/teams/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Fehler beim Erstellen der Einladung");
        return;
      }

      // Show the invite URL
      setInviteUrl(data.invitation.inviteUrl);
      router.refresh();
    } catch {
      setError("Fehler beim Erstellen der Einladung");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEmail("");
    setRole("member");
    setError("");
    setInviteUrl("");
    setCopied(false);
  };

  if (disabled) {
    return (
      <Button disabled className="opacity-50 cursor-not-allowed">
        <UserPlus className="w-4 h-4 mr-2" />
        Einladungen nicht verfügbar
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <UserPlus className="w-4 h-4 mr-2" />
        Mitglied einladen
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Mitglied einladen
            </h2>

            {inviteUrl ? (
              // Success state - show invite link
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 mb-2">
                    Einladung erstellt! Teile diesen Link:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={inviteUrl}
                      readOnly
                      className="flex-1 text-sm bg-white border border-green-300 rounded px-3 py-2"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="sm"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button onClick={handleClose} className="w-full">
                  Fertig
                </Button>
              </div>
            ) : (
              // Form state
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@beispiel.ch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="role"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Rolle
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="member">Mitglied</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    {role === "admin"
                      ? "Kann Chats erstellen und bearbeiten"
                      : "Kann Chats nutzen"}
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    {error}
                  </p>
                )}

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "Wird gesendet..." : "Einladen"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
