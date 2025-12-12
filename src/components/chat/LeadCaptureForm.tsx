"use client";

import { useState } from "react";
import { X, Send, Calendar, Mail } from "lucide-react";
import { useTypewriter } from "@/hooks/useTypewriter";

interface LeadCaptureFormProps {
  chatId: string;
  themeColor: { primary: string; light: string };
  calendarLink?: string | null;
  onClose: () => void;
  onSubmit: () => void;
}

export default function LeadCaptureForm({
  chatId,
  themeColor,
  calendarLink,
  onClose,
  onSubmit,
}: LeadCaptureFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Bitte Name und E-Mail ausfüllen");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Bitte eine gültige E-Mail-Adresse eingeben");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          name: name.trim(),
          email: email.trim(),
          message: message.trim() || undefined,
          source: "contact_form",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Senden");
      }

      setSuccess(true);
      onSubmit();

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleCalendarClick() {
    if (calendarLink) {
      window.open(calendarLink, "_blank", "noopener,noreferrer");
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: themeColor.light }}
          >
            <Mail className="w-8 h-8" style={{ color: themeColor.primary }} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Vielen Dank!
          </h3>
          <p className="text-gray-600">
            Wir haben deine Nachricht erhalten und melden uns bald bei dir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div
          className="p-4 text-white flex items-center justify-between"
          style={{ backgroundColor: themeColor.primary }}
        >
          <h3 className="text-lg font-semibold">Lass uns in Kontakt bleiben</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-gray-600 text-sm mb-4">
            Hinterlasse deine Kontaktdaten und wir melden uns bei dir!
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{
                // @ts-expect-error CSS variable for focus ring
                "--tw-ring-color": themeColor.primary,
              }}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{
                // @ts-expect-error CSS variable for focus ring
                "--tw-ring-color": themeColor.primary,
              }}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nachricht (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Wie können wir dir helfen?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              style={{
                // @ts-expect-error CSS variable for focus ring
                "--tw-ring-color": themeColor.primary,
              }}
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 text-white py-3 px-4 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: themeColor.primary }}
            >
              <Send className="w-4 h-4" />
              {loading ? "Wird gesendet..." : "Absenden"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-lg font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Später
            </button>
          </div>

          {/* Calendar Link */}
          {calendarLink && (
            <div className="pt-4 border-t">
              <button
                type="button"
                onClick={handleCalendarClick}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium border-2 transition-colors hover:bg-gray-50"
                style={{
                  borderColor: themeColor.primary,
                  color: themeColor.primary,
                }}
              >
                <Calendar className="w-4 h-4" />
                Direkt einen Termin buchen
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// Newsletter Message Component (appears as chat message)
interface NewsletterMessageProps {
  chatId: string;
  themeColor: { primary: string; light: string };
  onSubmit: () => void;
}

export function NewsletterMessage({ chatId, themeColor, onSubmit }: NewsletterMessageProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const introText = "Möchtest du regelmässig Updates erhalten? Trag dich in unseren Newsletter ein!";
  const { displayedText, isComplete, skip } = useTypewriter({
    text: introText,
    speed: 30,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Bitte eine gültige E-Mail-Adresse eingeben");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler");
      }

      setSuccess(true);
      onSubmit();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <p className="mb-2">Vielen Dank für deine Anmeldung!</p>
        <p className="text-gray-500">Du erhältst ab sofort unsere Updates.</p>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer"
      onClick={!isComplete ? skip : undefined}
      title={isComplete ? "" : "Klicken um vollständigen Text anzuzeigen"}
    >
      <p className="mb-3">
        {displayedText}
        {!isComplete && (
          <span
            className="inline-block w-1 h-4 ml-1 animate-pulse bg-gray-400"
            aria-hidden="true"
          />
        )}
      </p>
      {isComplete && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{
                // @ts-expect-error CSS variable for focus ring
                "--tw-ring-color": themeColor.primary,
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: themeColor.primary }}
            >
              {loading ? "..." : "Anmelden"}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}

// Contact Form Message Component (appears as chat message)
interface ContactFormMessageProps {
  chatId: string;
  themeColor: { primary: string; light: string };
  calendarLink?: string | null;
  onSubmit: () => void;
  defaultMessage?: string;
}

export function ContactFormMessage({ chatId, themeColor, calendarLink, onSubmit, defaultMessage }: ContactFormMessageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(defaultMessage || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const introText = "Hinterlasse uns deine Kontaktdaten - wir melden uns schnellstmöglich!";
  const { displayedText, isComplete, skip } = useTypewriter({
    text: introText,
    speed: 30,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Bitte Name und E-Mail ausfüllen");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Bitte eine gültige E-Mail-Adresse eingeben");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          name: name.trim(),
          email: email.trim(),
          message: message.trim() || undefined,
          source: "contact_form",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Senden");
      }

      setSuccess(true);
      onSubmit();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleCalendarClick() {
    if (calendarLink) {
      window.open(calendarLink, "_blank", "noopener,noreferrer");
    }
  }

  if (success) {
    return (
      <div>
        <p className="mb-2">Vielen Dank für deine Nachricht!</p>
        <p className="text-gray-500">Wir melden uns bald bei dir.</p>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer"
      onClick={!isComplete ? skip : undefined}
      title={isComplete ? "" : "Klicken um vollständigen Text anzuzeigen"}
    >
      <p className="mb-3">
        {displayedText}
        {!isComplete && (
          <span
            className="inline-block w-1 h-4 ml-1 animate-pulse bg-gray-400"
            aria-hidden="true"
          />
        )}
      </p>
      {isComplete && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name *"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{
                // @ts-expect-error CSS variable for focus ring
                "--tw-ring-color": themeColor.primary,
              }}
              disabled={loading}
            />
          </div>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de *"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{
                // @ts-expect-error CSS variable for focus ring
                "--tw-ring-color": themeColor.primary,
              }}
              disabled={loading}
            />
          </div>
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nachricht (optional)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 resize-none"
              style={{
                // @ts-expect-error CSS variable for focus ring
                "--tw-ring-color": themeColor.primary,
              }}
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: themeColor.primary }}
            >
              <Send className="w-4 h-4" />
              {loading ? "Wird gesendet..." : "Absenden"}
            </button>
          </div>
          {calendarLink && (
            <button
              type="button"
              onClick={handleCalendarClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg font-medium border-2 transition-colors hover:bg-gray-50"
              style={{
                borderColor: themeColor.primary,
                color: themeColor.primary,
              }}
            >
              <Calendar className="w-4 h-4" />
              Oder direkt einen Termin buchen
            </button>
          )}
        </form>
      )}
    </div>
  );
}

// Calendar Button Component
interface CalendarButtonProps {
  calendarLink: string;
  themeColor: { primary: string; light: string };
  variant?: "full" | "compact";
}

export function CalendarButton({
  calendarLink,
  themeColor,
  variant = "full",
}: CalendarButtonProps) {
  function handleClick() {
    window.open(calendarLink, "_blank", "noopener,noreferrer");
  }

  if (variant === "compact") {
    return (
      <button
        onClick={handleClick}
        className="p-2 rounded-full transition-colors hover:bg-gray-100"
        title="Termin buchen"
        style={{ color: themeColor.primary }}
      >
        <Calendar className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium border-2 transition-colors hover:bg-gray-50"
      style={{
        borderColor: themeColor.primary,
        color: themeColor.primary,
      }}
    >
      <Calendar className="w-4 h-4" />
      Termin buchen
    </button>
  );
}
