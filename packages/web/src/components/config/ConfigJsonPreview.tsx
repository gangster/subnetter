"use client";

import { useConfigStore } from "@/stores/configStore";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function ConfigJsonPreview() {
  const rawJson = useConfigStore((s) => s.rawJson);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-[hsl(var(--border))]">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-2">
        <span className="text-sm font-medium">JSON Preview</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-[hsl(var(--accent))]"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96 bg-[hsl(var(--muted))]">
        {rawJson || "{}"}
      </pre>
    </div>
  );
}
