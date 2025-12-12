"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, File, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface FileMetadata {
  documentName: string;
  displayName: string;
  uploadedAt: string;
  localPath: string;
  mimeType: string;
  sizeBytes: number;
}

interface DocumentUploadProps {
  chatId: string;
  initialFiles: FileMetadata[];
}

// Hilfsfunktion für Dateigrösse
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DocumentUpload({ chatId, initialFiles }: DocumentUploadProps) {
  const router = useRouter();
  const [files, setFiles] = useState<FileMetadata[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dateien laden
  const loadFiles = useCallback(async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Error loading files:", error);
    }
  }, [chatId]);

  // Datei hochladen
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/chats/${chatId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload fehlgeschlagen");
      }

      const data = await response.json();
      setFiles((prev) => [...prev, data.file]);
      toast.success(`"${file.name}" wurde hochgeladen`);
      router.refresh();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload fehlgeschlagen");
    } finally {
      setIsUploading(false);
    }
  };

  // Datei löschen
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/chats/${chatId}/documents?documentName=${encodeURIComponent(deleteTarget.documentName)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Löschen fehlgeschlagen");
      }

      setFiles((prev) => prev.filter((f) => f.documentName !== deleteTarget.documentName));
      toast.success(`"${deleteTarget.displayName}" wurde gelöscht`);
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error instanceof Error ? error.message : "Löschen fehlgeschlagen");
    } finally {
      setIsDeleting(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        uploadFile(droppedFiles[0]);
      }
    },
    [chatId]
  );

  // File Input Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      uploadFile(selectedFiles[0]);
    }
    e.target.value = ""; // Reset input
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Dokumente
        </h2>
        {files.length > 0 && (
          <span className="text-sm text-gray-500">
            {files.length} {files.length === 1 ? "Datei" : "Dateien"} · {formatFileSize(files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0))}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Lade Dokumente hoch, auf deren Basis der Chatbot antwortet (PDF, DOCX, TXT, etc.)
      </p>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          type="file"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
          accept=".pdf,.doc,.docx,.txt,.md,.csv,.json"
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
            <p className="text-gray-600">Wird hochgeladen...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-10 h-10 text-gray-400 mb-3" />
            <p className="text-gray-600 mb-1">
              Datei hierher ziehen oder klicken zum Auswählen
            </p>
            <p className="text-sm text-gray-400">
              PDF, DOCX, TXT, MD, CSV, JSON
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file) => (
            <div
              key={file.documentName}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {file.displayName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(file.uploadedAt).toLocaleDateString("de-CH")}
                    {file.sizeBytes && ` · ${formatFileSize(file.sizeBytes)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTarget(file)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`"${deleteTarget?.displayName}" löschen?`}
        description="Das Dokument wird aus dem Chatbot entfernt und kann nicht wiederhergestellt werden."
        confirmLabel="Endgültig löschen"
        cancelLabel="Abbrechen"
        variant="danger"
        isLoading={isDeleting}
      />
    </section>
  );
}
