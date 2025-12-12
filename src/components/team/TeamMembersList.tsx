"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, UserMinus, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Member {
  id: string;
  odcuserId: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  joinedAt: Date;
}

interface Props {
  members: Member[];
  currentUserId: string;
  canManageMembers: boolean;
  canChangeRoles: boolean;
}

export function TeamMembersList({
  members,
  currentUserId,
  canManageMembers,
  canChangeRoles,
}: Props) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const roleColors = {
    owner: "bg-yellow-100 text-yellow-800",
    admin: "bg-blue-100 text-blue-800",
    member: "bg-gray-100 text-gray-800",
  };

  const roleLabels = {
    owner: "Owner",
    admin: "Admin",
    member: "Mitglied",
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Möchtest du dieses Mitglied wirklich entfernen?")) return;

    setLoading(userId);
    try {
      const response = await fetch(`/api/teams/members/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Fehler beim Entfernen");
        return;
      }

      router.refresh();
    } catch {
      alert("Fehler beim Entfernen");
    } finally {
      setLoading(null);
      setOpenMenuId(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setLoading(userId);
    try {
      const response = await fetch(`/api/teams/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Fehler beim Ändern der Rolle");
        return;
      }

      router.refresh();
    } catch {
      alert("Fehler beim Ändern der Rolle");
    } finally {
      setLoading(null);
      setOpenMenuId(null);
    }
  };

  return (
    <div className="divide-y divide-gray-200">
      {members.map((member) => {
        const isCurrentUser = member.odcuserId === currentUserId;
        const isOwner = member.role === "owner";
        const canManageThisMember = canManageMembers && !isCurrentUser && !isOwner;
        const isLoading = loading === member.odcuserId;

        return (
          <div
            key={member.id}
            className="flex items-center justify-between px-6 py-4"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-10 h-10 object-cover"
                  />
                ) : (
                  <span className="text-blue-600 font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {member.name}
                  {isCurrentUser && (
                    <span className="text-gray-400 text-sm ml-2">(Du)</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  roleColors[member.role as keyof typeof roleColors] ||
                  roleColors.member
                }`}
              >
                {roleLabels[member.role as keyof typeof roleLabels] ||
                  member.role}
              </span>
              <span className="text-sm text-gray-500">
                Seit{" "}
                {member.joinedAt
                  ? new Date(member.joinedAt).toLocaleDateString("de-CH")
                  : "-"}
              </span>

              {/* Action Menu */}
              {canManageThisMember && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === member.odcuserId ? null : member.odcuserId
                      )
                    }
                    disabled={isLoading}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>

                  {openMenuId === member.odcuserId && (
                    <>
                      {/* Backdrop to close menu */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        {canChangeRoles && (
                          <>
                            {member.role !== "admin" && (
                              <button
                                onClick={() =>
                                  handleChangeRole(member.odcuserId, "admin")
                                }
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                disabled={isLoading}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Zum Admin machen
                              </button>
                            )}
                            {member.role !== "member" && (
                              <button
                                onClick={() =>
                                  handleChangeRole(member.odcuserId, "member")
                                }
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                disabled={isLoading}
                              >
                                <User className="w-4 h-4 mr-2" />
                                Zum Mitglied machen
                              </button>
                            )}
                            <hr className="my-1" />
                          </>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member.odcuserId)}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          disabled={isLoading}
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Entfernen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {members.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Keine Mitglieder gefunden
        </div>
      )}
    </div>
  );
}
