"use client";

import { useState, useRef, useEffect } from "react";
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
  User,
  ChevronUp,
  Sparkles,
  Target,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Chats", href: "/dashboard/chats", icon: MessageSquare },
  { name: "Leads", href: "/dashboard/leads", icon: Target },
  { name: "Team", href: "/dashboard/team", icon: Users },
];

const profileMenuItems = [
  { name: "Upgrade", href: "/dashboard/upgrade", icon: Sparkles },
  { name: "Einstellungen", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.isSuperAdmin;
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      {/* Profile Dropdown */}
      <div className="p-3 border-t border-gray-800 relative" ref={dropdownRef}>
        {/* Dropdown Menu (opens upward) */}
        {profileOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden">
            {profileMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setProfileOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.name}
                </Link>
              );
            })}
            <div className="border-t border-gray-700">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Abmelden
              </button>
            </div>
          </div>
        )}

        {/* Profile Button */}
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 bg-gray-700 rounded-full mr-3">
            <User className="w-4 h-4 text-gray-300" />
          </div>
          <div className="flex-1 text-left truncate">
            <p className="font-medium text-white truncate">
              {session?.user?.name || "Benutzer"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {session?.user?.email}
            </p>
          </div>
          <ChevronUp
            className={cn(
              "w-4 h-4 text-gray-500 transition-transform",
              profileOpen ? "rotate-180" : ""
            )}
          />
        </button>
      </div>
    </div>
  );
}
