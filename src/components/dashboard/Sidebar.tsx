"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Chats", href: "/dashboard/chats", icon: MessageSquare },
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Einstellungen", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.isSuperAdmin;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-800">
        <MessageSquare className="w-8 h-8 text-blue-500" />
        <span className="ml-3 text-xl font-bold">ChatBot</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}

        {/* Admin Link - nur für Super-Admins */}
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="flex items-center px-3 py-2 mt-4 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors border border-red-800/50"
          >
            <Shield className="w-5 h-5 mr-3" />
            Admin-Bereich
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Abmelden
        </button>
      </div>
    </div>
  );
}
