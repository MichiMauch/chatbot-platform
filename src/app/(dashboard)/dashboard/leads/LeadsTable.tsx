"use client";

import { useState } from "react";
import { Users, Download, Mail, Phone, MessageSquare, Trash2, Check, Clock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Lead {
  id: string;
  chatId: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string;
  status: string | null;
  createdAt: Date | null;
  chatName: string;
}

interface Chat {
  id: string;
  displayName: string;
}

interface LeadsTableProps {
  leads: Lead[];
  chats: Chat[];
}

const statusLabels: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  new: { label: "Neu", color: "bg-blue-100 text-blue-700", icon: Clock },
  contacted: { label: "Kontaktiert", color: "bg-yellow-100 text-yellow-700", icon: UserCheck },
  converted: { label: "Konvertiert", color: "bg-green-100 text-green-700", icon: Check },
};

const sourceLabels: Record<string, string> = {
  contact_form: "Kontaktformular",
  newsletter: "Newsletter",
  interest: "Interesse",
};

export default function LeadsTable({ leads, chats }: LeadsTableProps) {
  const [filterChat, setFilterChat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState(leads);

  // Filter leads
  const filteredLeads = localLeads.filter((lead) => {
    if (filterChat !== "all" && lead.chatId !== filterChat) return false;
    if (filterStatus !== "all" && lead.status !== filterStatus) return false;
    return true;
  });

  // Update lead status
  async function handleStatusChange(leadId: string, newStatus: string) {
    setUpdatingId(leadId);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setLocalLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId ? { ...lead, status: newStatus } : lead
          )
        );
      }
    } catch (error) {
      console.error("Error updating lead:", error);
    } finally {
      setUpdatingId(null);
    }
  }

  // Delete lead
  async function handleDelete(leadId: string) {
    if (!confirm("Diesen Lead wirklich löschen?")) return;

    setDeletingId(leadId);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLocalLeads((prev) => prev.filter((lead) => lead.id !== leadId));
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
    } finally {
      setDeletingId(null);
    }
  }

  // Export to CSV
  function handleExport() {
    const headers = ["Name", "E-Mail", "Telefon", "Chat", "Quelle", "Status", "Nachricht", "Datum/Zeit"];
    const rows = filteredLeads.map((lead) => [
      lead.name,
      lead.email,
      lead.phone || "",
      lead.chatName,
      sourceLabels[lead.source] || lead.source,
      statusLabels[lead.status || "new"]?.label || lead.status,
      lead.message?.replace(/"/g, '""') || "",
      lead.createdAt ? new Date(lead.createdAt).toLocaleString("de-CH") : "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (localLeads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Noch keine Leads
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Sobald Besucher das Kontaktformular in deinen Chats ausfüllen,
          erscheinen sie hier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Export */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          {/* Chat Filter */}
          <select
            value={filterChat}
            onChange={(e) => setFilterChat(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle Chats</option>
            {chats.map((chat) => (
              <option key={chat.id} value={chat.id}>
                {chat.displayName}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle Status</option>
            <option value="new">Neu</option>
            <option value="contacted">Kontaktiert</option>
            <option value="converted">Konvertiert</option>
          </select>
        </div>

        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          CSV Export
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontakt
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chat
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quelle
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum/Zeit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeads.map((lead) => {
                const statusInfo = statusLabels[lead.status || "new"] || statusLabels.new;
                const StatusIcon = statusInfo.icon;

                return (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {lead.name}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <a
                              href={`mailto:${lead.email}`}
                              className="flex items-center gap-1 hover:text-blue-600"
                            >
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </a>
                            {lead.phone && (
                              <a
                                href={`tel:${lead.phone}`}
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </a>
                            )}
                          </div>
                          {lead.message && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1 max-w-xs">
                              <MessageSquare className="w-3 h-3 inline mr-1" />
                              {lead.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {lead.chatName}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {sourceLabels[lead.source] || lead.source}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={lead.status || "new"}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        disabled={updatingId === lead.id}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusInfo.color} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="new">Neu</option>
                        <option value="contacted">Kontaktiert</option>
                        <option value="converted">Konvertiert</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {lead.createdAt
                        ? new Date(lead.createdAt).toLocaleString("de-CH")
                        : "-"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={deletingId === lead.id}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer with count */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          {filteredLeads.length} von {localLeads.length} Leads
        </div>
      </div>
    </div>
  );
}
