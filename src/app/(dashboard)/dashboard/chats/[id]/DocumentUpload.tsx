"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Paper,
  Text,
  Stack,
  Group,
  ActionIcon,
  Loader,
  Box,
  rem,
} from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { IconUpload, IconFile, IconTrash, IconX } from "@tabler/icons-react";
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
  const [deleteTarget, setDeleteTarget] = useState<FileMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Handle file drop
  const handleDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadFile(acceptedFiles[0]);
    }
  }, [chatId]);

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="lg" fw={600}>Dokumente</Text>
        {files.length > 0 && (
          <Text size="sm" c="dimmed">
            {files.length} {files.length === 1 ? "Datei" : "Dateien"} · {formatFileSize(files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0))}
          </Text>
        )}
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Lade Dokumente hoch, auf deren Basis der Chatbot antwortet (PDF, DOCX, TXT, etc.)
      </Text>

      {/* Upload Zone */}
      <Dropzone
        onDrop={handleDrop}
        loading={isUploading}
        accept={[
          MIME_TYPES.pdf,
          MIME_TYPES.doc,
          MIME_TYPES.docx,
          "text/plain",
          "text/markdown",
          MIME_TYPES.csv,
          "application/json",
        ]}
        maxFiles={1}
        multiple={false}
      >
        <Group justify="center" gap="xl" mih={100} style={{ pointerEvents: "none" }}>
          <Dropzone.Accept>
            <IconUpload
              style={{ width: rem(40), height: rem(40), color: "var(--mantine-color-blue-6)" }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{ width: rem(40), height: rem(40), color: "var(--mantine-color-red-6)" }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconUpload
              style={{ width: rem(40), height: rem(40), color: "var(--mantine-color-dimmed)" }}
              stroke={1.5}
            />
          </Dropzone.Idle>

          <div>
            <Text size="sm" inline>
              Datei hierher ziehen oder klicken zum Auswählen
            </Text>
            <Text size="xs" c="dimmed" inline mt={7}>
              PDF, DOCX, TXT, MD, CSV, JSON
            </Text>
          </div>
        </Group>
      </Dropzone>

      {/* File List */}
      {files.length > 0 && (
        <Stack gap="xs" mt="md">
          {files.map((file) => (
            <Paper key={file.documentName} p="sm" bg="gray.0" radius="md">
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <IconFile size={20} color="gray" />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {file.displayName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(file.uploadedAt).toLocaleDateString("de-CH")}
                      {file.sizeBytes && ` · ${formatFileSize(file.sizeBytes)}`}
                    </Text>
                  </Box>
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => setDeleteTarget(file)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
        </Stack>
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
    </Paper>
  );
}
