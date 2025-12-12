"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface DeleteChatButtonProps {
  chatId: string;
  chatName: string;
}

export function DeleteChatButton({ chatId, chatName }: DeleteChatButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Fehler beim Löschen");
        return;
      }

      toast.success(`Chat "${chatName}" wurde gelöscht`);
      setIsOpen(false);
      router.refresh();
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
        title="Chat löschen"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        title={`Chat "${chatName}" löschen?`}
        description="Diese Aktion kann nicht rückgängig gemacht werden. Alle Nachrichten und Daten werden endgültig gelöscht."
        confirmLabel="Endgültig löschen"
        cancelLabel="Abbrechen"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
