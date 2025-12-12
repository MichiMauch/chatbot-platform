// Helper functions for admin statistics

interface FileMetadata {
  documentName: string;
  displayName: string;
  uploadedAt: string;
  localPath: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Calculate total storage from files JSON
 */
export function calculateStorageFromFiles(filesJson: string | null): number {
  if (!filesJson) return 0;
  try {
    const files: FileMetadata[] = JSON.parse(filesJson);
    return files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Get file count from files JSON
 */
export function getFileCount(filesJson: string | null): number {
  if (!filesJson) return 0;
  try {
    const files: FileMetadata[] = JSON.parse(filesJson);
    return files.length;
  } catch {
    return 0;
  }
}

/**
 * Parse files JSON to FileMetadata array
 */
export function parseFilesJson(filesJson: string | null): FileMetadata[] {
  if (!filesJson) return [];
  try {
    return JSON.parse(filesJson);
  } catch {
    return [];
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

/**
 * Format token count to human readable string
 */
export function formatTokens(tokens: number): string {
  if (tokens === 0) return "0";
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1000000) return (tokens / 1000).toFixed(1) + "K";
  return (tokens / 1000000).toFixed(2) + "M";
}

/**
 * Format milliseconds to human readable duration
 */
export function formatResponseTime(ms: number | null): string {
  if (!ms) return "-";
  if (ms < 1000) return ms + "ms";
  return (ms / 1000).toFixed(1) + "s";
}

/**
 * Format cost in cents to USD string
 */
export function formatCost(cents: number | null): string {
  if (!cents) return "$0.00";
  return "$" + (cents / 100).toFixed(2);
}

/**
 * Format relative time (e.g., "vor 2 Stunden")
 */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return "-";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString("de-CH");
}

/**
 * Calculate error rate percentage
 */
export function calculateErrorRate(
  totalMessages: number,
  errorCount: number
): string {
  if (totalMessages === 0) return "0%";
  const rate = (errorCount / totalMessages) * 100;
  return rate.toFixed(1) + "%";
}
