"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Menu, Shield } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SessionProvider>
      <div className="flex h-screen bg-gray-100">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <AdminSidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="flex items-center h-16 px-4 bg-white border-b shadow-sm lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center ml-2 lg:ml-0">
              <Shield className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-600">
                Super-Admin-Bereich
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
