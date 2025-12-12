"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewChatPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-generiere URL-freundlichen Namen
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!name || name === slugify(displayName)) {
      setName(slugify(value));
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" })[c] || c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayName, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fehler beim Erstellen");
        return;
      }

      toast.success(`Chat "${displayName}" wurde erstellt`);
      router.push(`/dashboard/chats/${data.id}`);
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/chats"
        className="inline-flex items-center text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zu Chats
      </Link>

      {/* Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Neuen Chat erstellen
              </h1>
              <p className="text-sm text-gray-500">
                Erstelle einen neuen RAG-Chatbot
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="displayName"
              type="text"
              label="Name"
              placeholder="Mein Chatbot"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              required
            />

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                URL-Name
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 text-sm mr-2">
                  /c/
                </span>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(slugify(e.target.value))}
                  placeholder="mein-chatbot"
                  required
                  pattern="[a-z0-9-]+"
                  className="flex-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Dieser Name wird in der URL verwendet und kann nicht geändert
                werden.
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Beschreibung (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibe, wofür dieser Chatbot verwendet wird..."
                rows={3}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Link href="/dashboard/chats">
                <Button type="button" variant="outline">
                  Abbrechen
                </Button>
              </Link>
              <Button type="submit" isLoading={isLoading}>
                Chat erstellen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
