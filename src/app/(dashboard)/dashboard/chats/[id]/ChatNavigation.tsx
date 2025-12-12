"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Settings } from "lucide-react";

interface ChatNavigationProps {
  chatId: string;
}

export function ChatNavigation({ chatId }: ChatNavigationProps) {
  const pathname = usePathname();

  const basePath = `/dashboard/chats/${chatId}`;
  const isSettingsPage = pathname.endsWith("/settings");

  const links = [
    {
      href: basePath,
      label: "Inhalte",
      icon: FileText,
      active: !isSettingsPage,
    },
    {
      href: `${basePath}/settings`,
      label: "Einstellungen",
      icon: Settings,
      active: isSettingsPage,
    },
  ];

  return (
    <div className="flex gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            link.active
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <link.icon className="w-4 h-4 mr-2" />
          {link.label}
        </Link>
      ))}
    </div>
  );
}
