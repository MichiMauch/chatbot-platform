"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CopyUrlButtonProps {
  url: string;
}

export function CopyUrlButton({ url }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const fullUrl = window.location.origin + url;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("URL kopiert!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" onClick={handleCopy}>
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  );
}
