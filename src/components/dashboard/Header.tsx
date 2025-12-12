"use client";

import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Spacer for desktop */}
      <div className="hidden lg:block" />

      {/* User info */}
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            {session?.user?.name || "Benutzer"}
          </p>
          <p className="text-xs text-gray-500">{session?.user?.email}</p>
        </div>
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-medium">
            {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
          </span>
        </div>
      </div>
    </header>
  );
}
