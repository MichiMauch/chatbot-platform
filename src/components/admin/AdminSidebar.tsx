"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  MessageSquare,
  BarChart3,
  ArrowLeft,
  LogOut,
  Shield,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Übersicht", href: "/admin", icon: LayoutDashboard },
  { name: "Benutzer", href: "/admin/users", icon: Users },
  { name: "Teams", href: "/admin/teams", icon: Building2 },
  { name: "Chats", href: "/admin/chats", icon: MessageSquare },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-red-950 text-white w-64">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-red-900">
        <Shield className="w-8 h-8 text-red-400" />
        <span className="ml-3 text-xl font-bold">Admin</span>
      </div>

      {/* Back to Dashboard */}
      <div className="px-3 py-3 border-b border-red-900">
        <Link
          href="/dashboard"
          className="flex items-center px-3 py-2 text-sm font-medium text-red-300 rounded-lg hover:bg-red-900 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-3" />
          Zurück zum Dashboard
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-red-900 text-white"
                  : "text-red-300 hover:bg-red-900 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-red-900">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-300 rounded-lg hover:bg-red-900 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Abmelden
        </button>
      </div>
    </div>
  );
}
