"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { User, Mail, Lock, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: API-Call zum Aktualisieren des Profils
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-500 mt-1">
          Verwalte dein Konto und deine Präferenzen
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Profil</h2>
              <p className="text-sm text-gray-500">
                Deine persönlichen Informationen
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input
              id="name"
              type="text"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail
              </label>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{session?.user?.email}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Die E-Mail-Adresse kann nicht geändert werden.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={isLoading}>
                Speichern
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Lock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Passwort</h2>
              <p className="text-sm text-gray-500">Ändere dein Passwort</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <Input
              id="currentPassword"
              type="password"
              label="Aktuelles Passwort"
              placeholder="••••••••"
            />
            <Input
              id="newPassword"
              type="password"
              label="Neues Passwort"
              placeholder="Mindestens 8 Zeichen"
            />
            <Input
              id="confirmPassword"
              type="password"
              label="Passwort bestätigen"
              placeholder="Passwort wiederholen"
            />
            <div className="flex justify-end">
              <Button type="submit">Passwort ändern</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Benachrichtigungen</h2>
              <p className="text-sm text-gray-500">
                E-Mail-Benachrichtigungen verwalten
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <NotificationToggle
              label="Wöchentlicher Nutzungsbericht"
              description="Erhalte eine Zusammenfassung deiner Chat-Nutzung"
              defaultChecked={true}
            />
            <NotificationToggle
              label="Limit-Warnungen"
              description="Werde benachrichtigt, wenn du 80% deines Limits erreichst"
              defaultChecked={true}
            />
            <NotificationToggle
              label="Produkt-Updates"
              description="Neuigkeiten über neue Features und Verbesserungen"
              defaultChecked={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Gefahrenzone</h2>
              <p className="text-sm text-gray-500">
                Irreversible Aktionen
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <p className="font-medium text-red-900">Konto löschen</p>
              <p className="text-sm text-red-700">
                Alle Daten werden unwiderruflich gelöscht.
              </p>
            </div>
            <Button variant="danger">Konto löschen</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
