"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Settings2, BarChart3 } from "lucide-react";
import { useSettingsSave } from "@/contexts/SettingsSaveContext";

interface ChatTabsProps {
  chatId: string;
}

const tabs = [
  { name: "Inhalte", href: "", icon: FileText },
  { name: "Einstellungen", href: "/settings", icon: Settings2 },
  { name: "Statistiken", href: "/analytics", icon: BarChart3 },
];

export function ChatTabs({ chatId }: ChatTabsProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/chats/${chatId}`;
  const { saveButton } = useSettingsSave();

  const getIsActive = (tabHref: string) => {
    if (tabHref === "") {
      // "Inhalte" tab is active when at base path (not settings or analytics)
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(`${basePath}${tabHref}`);
  };

  return (
    <div className="border-b border-gray-200 flex justify-between items-center">
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = getIsActive(tab.href);
          return (
            <Link
              key={tab.name}
              href={`${basePath}${tab.href}`}
              className={cn(
                "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </Link>
          );
        })}
      </nav>
      {saveButton}
    </div>
  );
}
