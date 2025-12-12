"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Globe, Loader2 } from "lucide-react";
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
    <div className="space-y-4">
      {/* Toggle Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Inhaltsquelle
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleTypeChange("documents")}
            disabled={isUpdating}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              uploadType === "documents"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } disabled:opacity-50`}
          >
            {isUpdating && uploadType !== "documents" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Dokumente
          </button>
          <button
            onClick={() => handleTypeChange("website")}
            disabled={isUpdating}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              uploadType === "website"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } disabled:opacity-50`}
          >
            {isUpdating && uploadType !== "website" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            Website
          </button>
        </div>
      </div>

      {/* Content based on type */}
      {uploadType === "documents" ? (
        <DocumentUpload chatId={chatId} initialFiles={initialFiles} />
      ) : (
        <WebsiteScraper chatId={chatId} sitemapUrls={sitemapUrls} />
      )}
    </div>
  );
}
