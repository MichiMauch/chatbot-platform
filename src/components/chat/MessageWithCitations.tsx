"use client";

import React, { useMemo, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import CodeBlock from "./CodeBlock";
import CitationMarker, { Source } from "./CitationMarker";
import { ExternalLink, FileText, Loader2 } from "lucide-react";

export interface Citation {
  startIndex: number;
  endIndex: number;
  text: string;
  sourceIndices: number[];
}

interface MessageWithCitationsProps {
  content: string;
  citations?: Citation[];
  sources?: Source[];
  onDocumentClick?: (source: Source) => void;
}

// SourceCard component with OG-Image loading
function SourceCard({
  source,
  index,
  onDocumentClick,
}: {
  source: Source;
  index: number;
  onDocumentClick?: (source: Source) => void;
}) {
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (source.url) {
      setIsLoading(true);
      fetch(`/api/fetch-og-image?url=${encodeURIComponent(source.url)}`)
        .then((res) => res.json())
        .then((data) => setOgImage(data.ogImage || null))
        .catch(() => setOgImage(null))
        .finally(() => setIsLoading(false));
    }
  }, [source.url]);

  const hostname = source.url ? new URL(source.url).hostname : null;

  if (source.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
      >
        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
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
            <ExternalLink className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2">
            [{index + 1}] {source.displayName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{hostname}</p>
        </div>
      </a>
    );
  }

  if (source.localPath && onDocumentClick) {
    return (
      <button
        onClick={() => onDocumentClick(source)}
        className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group w-full text-left"
      >
        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          <FileText className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2">
            [{index + 1}] {source.displayName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Dokument öffnen</p>
        </div>
      </button>
    );
  }

  return (
    <div className="flex gap-3 p-2">
      <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <FileText className="w-5 h-5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">
          [{index + 1}] {source.displayName}
        </p>
      </div>
    </div>
  );
}

export default function MessageWithCitations({
  content,
  citations,
  sources,
  onDocumentClick,
}: MessageWithCitationsProps) {
  // Create a map from source index to citation number
  const sourceMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!citations || !sources) return map;

    let citNum = 1;
    const usedIndices = new Set<number>();

    for (const citation of citations) {
      for (const sourceIndex of citation.sourceIndices) {
        if (!usedIndices.has(sourceIndex) && sourceIndex < sources.length) {
          map.set(sourceIndex, citNum);
          usedIndices.add(sourceIndex);
          citNum++;
        }
      }
    }

    return map;
  }, [citations, sources]);

  // Get unique sources in order
  const uniqueSources = useMemo(() => {
    if (!sources) return [];

    const result: Source[] = [];
    const entries = Array.from(sourceMap.entries()).sort((a, b) => a[1] - b[1]);

    for (const [sourceIndex] of entries) {
      if (sourceIndex < sources.length) {
        result.push(sources[sourceIndex]);
      }
    }

    return result;
  }, [sources, sourceMap]);

  // Split content into segments with citations
  const contentSegments = useMemo(() => {
    if (!citations || !sources || citations.length === 0 || sources.length === 0) {
      return [{ type: "text" as const, content }];
    }

    // Create a map of positions to citation numbers
    const positionToCitations = new Map<number, number[]>();

    for (const citation of citations) {
      for (const sourceIndex of citation.sourceIndices) {
        const citNum = sourceMap.get(sourceIndex);
        if (citNum) {
          const existing = positionToCitations.get(citation.endIndex) || [];
          if (!existing.includes(citNum)) {
            existing.push(citNum);
          }
          positionToCitations.set(citation.endIndex, existing);
        }
      }
    }

    // Split content into segments
    const positions = Array.from(positionToCitations.keys()).sort((a, b) => a - b);
    const segments: Array<{
      type: "text" | "citation";
      content?: string;
      citNums?: number[];
    }> = [];

    let lastPos = 0;
    for (const position of positions) {
      if (position > lastPos && position <= content.length) {
        segments.push({ type: "text", content: content.slice(lastPos, position) });
      }
      const citNums = positionToCitations.get(position) || [];
      if (citNums.length > 0) {
        segments.push({ type: "citation", citNums });
      }
      lastPos = position;
    }

    if (lastPos < content.length) {
      segments.push({ type: "text", content: content.slice(lastPos) });
    }

    return segments;
  }, [content, citations, sources, sourceMap]);

  return (
    <div>
      {/* Content with inline citations */}
      <div className="prose prose-sm sm:prose-base max-w-none prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
        {contentSegments.map((segment, index) => {
          if (segment.type === "text") {
            return (
              <ReactMarkdown
                key={index}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <CodeBlock
                        language={match[1]}
                        value={String(children).replace(/\n$/, "")}
                      />
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Return fragment to prevent line breaks with citations
                  p({ children }) {
                    return <>{children}</>;
                  },
                }}
              >
                {segment.content || ""}
              </ReactMarkdown>
            );
          } else {
            return (
              <span key={index} className="inline">
                {segment.citNums?.map((citNum) => {
                  const source = uniqueSources[citNum - 1];
                  return source ? (
                    <CitationMarker
                      key={citNum}
                      citationNumber={citNum}
                      source={source}
                      onDocumentClick={onDocumentClick}
                    />
                  ) : null;
                })}
              </span>
            );
          }
        })}
      </div>

      {/* Source list at the end */}
      {uniqueSources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="font-semibold text-gray-700 text-sm mb-2">Quellen:</div>
          <div className="space-y-1">
            {uniqueSources.map((source, index) => (
              <SourceCard
                key={index}
                source={source}
                index={index}
                onDocumentClick={onDocumentClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
