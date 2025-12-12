"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ExternalLink, Loader2 } from "lucide-react";

export interface Source {
  displayName: string;
  localPath?: string;
  url?: string;
  mimeType?: string;
}

interface CitationMarkerProps {
  citationNumber: number;
  source: Source;
  onDocumentClick?: (source: Source) => void;
}

export default function CitationMarker({
  citationNumber,
  source,
  onDocumentClick,
}: CitationMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [hasTriedLoading, setHasTriedLoading] = useState(false);

  // Load OG-Image when hovered for the first time
  useEffect(() => {
    if (isHovered && source.url && !hasTriedLoading) {
      setHasTriedLoading(true);
      setIsLoadingImage(true);

      fetch(`/api/fetch-og-image?url=${encodeURIComponent(source.url)}`)
        .then((res) => res.json())
        .then((data) => {
          setOgImage(data.ogImage || null);
        })
        .catch(() => {
          setOgImage(null);
        })
        .finally(() => {
          setIsLoadingImage(false);
        });
    }
  }, [isHovered, source.url, hasTriedLoading]);

  return (
    <span
      className="relative inline-block mx-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Superscript Number */}
      <sup className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
        [{citationNumber}]
      </sup>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64"
          >
            <div className="bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden">
              {source.url ? (
                // Web Source
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="relative h-24 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {isLoadingImage ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : ogImage ? (
                      <img
                        src={ogImage}
                        alt={source.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <ExternalLink className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                  </div>
                  <div className="p-3 bg-white">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {source.displayName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {new URL(source.url).hostname}
                    </p>
                  </div>
                </a>
              ) : source.localPath && onDocumentClick ? (
                // Local Document
                <button
                  onClick={() => onDocumentClick(source)}
                  className="block w-full text-left group"
                >
                  <div className="relative h-20 bg-gray-100 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="p-3 bg-white">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {source.displayName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      Dokument öffnen
                    </p>
                  </div>
                </button>
              ) : (
                // No action available
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {source.displayName}
                  </p>
                </div>
              )}
            </div>

            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-3 h-3 bg-white border-b border-r border-gray-300 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
