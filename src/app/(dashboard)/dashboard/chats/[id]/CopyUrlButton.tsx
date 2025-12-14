"use client";

import { useState } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCopy, IconCheck } from "@tabler/icons-react";
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
    <Tooltip label={copied ? "Kopiert!" : "URL kopieren"}>
      <ActionIcon variant="light" color={copied ? "green" : "gray"} onClick={handleCopy}>
        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
      </ActionIcon>
    </Tooltip>
  );
}
