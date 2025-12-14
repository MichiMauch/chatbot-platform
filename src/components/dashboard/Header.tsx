"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Switch, ActionIcon, Tooltip, Group } from "@mantine/core";
import { IconExternalLink, IconPlus, IconSettings } from "@tabler/icons-react";
import { InviteButton } from "@/components/team/InviteButton";
import { toast } from "sonner";
import { usePageTitle } from "@/contexts/PageTitleContext";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const { title, subtitle, chatData, headerAction, setIsPublic } = usePageTitle();

  const handlePublicToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!chatData || !chatData.allowPublicChats) return;
    const newValue = e.currentTarget.checked;
    setIsPublic(newValue);

    try {
      const response = await fetch(`/api/chats/${chatData.chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newValue }),
      });
      if (!response.ok) {
        setIsPublic(!newValue);
        toast.error("Fehler beim Speichern");
      }
    } catch {
      setIsPublic(!newValue);
      toast.error("Ein Fehler ist aufgetreten");
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Menu button + Page title + Chat actions */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Page title */}
        {title && (
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </div>

            {/* Header action (e.g., "New Chat" button or Invite button) */}
            {headerAction && headerAction.icon === "user-plus" ? (
              <InviteButton iconOnly size={48} disabled={headerAction.disabled} />
            ) : headerAction && (
              <Tooltip label={headerAction.tooltip}>
                <Link href={headerAction.href!}>
                  <ActionIcon
                    variant="filled"
                    size={48}
                    disabled={headerAction.disabled}
                  >
                    {headerAction.icon === "plus" && <IconPlus size={18} />}
                    {headerAction.icon === "settings" && <IconSettings size={18} />}
                  </ActionIcon>
                </Link>
              </Tooltip>
            )}

            {/* Chat-specific actions */}
            {chatData && (
              <Group gap="sm">
                <Tooltip label="Chat öffnen">
                  <ActionIcon
                    component="a"
                    href={`/c/${chatData.chatSlug}`}
                    target="_blank"
                    variant="subtle"
                    color="gray"
                  >
                    <IconExternalLink size={18} />
                  </ActionIcon>
                </Tooltip>
                <Switch
                  size="sm"
                  label="Öffentlich"
                  checked={chatData.isPublic}
                  onChange={handlePublicToggle}
                  disabled={!chatData.allowPublicChats}
                />
              </Group>
            )}
          </div>
        )}
      </div>

      {/* Right: User info */}
      <div className="flex items-center space-x-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900">
            {session?.user?.name || "Benutzer"}
          </p>
          <p className="text-xs text-gray-500">{session?.user?.email}</p>
        </div>
        <div className="h-12 w-12 bg-[var(--mantine-primary-color-filled)] rounded-lg flex items-center justify-center">
          <span className="text-white font-medium text-lg">
            {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
          </span>
        </div>
      </div>
    </header>
  );
}
