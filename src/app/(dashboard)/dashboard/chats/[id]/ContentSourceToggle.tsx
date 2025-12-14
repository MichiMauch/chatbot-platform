"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Paper, Text, SegmentedControl, Stack, Center, Loader } from "@mantine/core";
import { IconFileText, IconWorld } from "@tabler/icons-react";
import { toast } from "sonner";
import { DocumentUpload } from "./DocumentUpload";
import { WebsiteScraper } from "./WebsiteScraper";

interface FileMetadata {
  documentName: string;
  displayName: string;
  uploadedAt: string;
  localPath: string;
  mimeType: string;
  sizeBytes: number;
}

interface ContentSourceToggleProps {
  chatId: string;
  initialUploadType: string;
  initialFiles: FileMetadata[];
  sitemapUrls: string[];
}

export function ContentSourceToggle({
  chatId,
  initialUploadType,
  initialFiles,
  sitemapUrls,
}: ContentSourceToggleProps) {
  const router = useRouter();
  const [uploadType, setUploadType] = useState(initialUploadType || "documents");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleTypeChange = async (newType: string) => {
    if (newType === uploadType) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadType: newType }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Speichern");
      }

      setUploadType(newType);
      router.refresh();
    } catch (error) {
      console.error("Error updating upload type:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Stack gap="md">
      {/* Toggle Buttons */}
      <Paper p="md" withBorder>
        <Text size="sm" fw={500} mb="sm">
          Inhaltsquelle
        </Text>
        <SegmentedControl
          value={uploadType}
          onChange={handleTypeChange}
          disabled={isUpdating}
          fullWidth
          data={[
            {
              value: "documents",
              label: (
                <Center style={{ gap: 8 }}>
                  {isUpdating && uploadType !== "documents" ? (
                    <Loader size={14} />
                  ) : (
                    <IconFileText size={16} />
                  )}
                  <span>Dokumente</span>
                </Center>
              ),
            },
            {
              value: "website",
              label: (
                <Center style={{ gap: 8 }}>
                  {isUpdating && uploadType !== "website" ? (
                    <Loader size={14} />
                  ) : (
                    <IconWorld size={16} />
                  )}
                  <span>Website</span>
                </Center>
              ),
            },
          ]}
        />
      </Paper>

      {/* Content based on type */}
      {uploadType === "documents" ? (
        <DocumentUpload chatId={chatId} initialFiles={initialFiles} />
      ) : (
        <WebsiteScraper chatId={chatId} sitemapUrls={sitemapUrls} />
      )}
    </Stack>
  );
}
