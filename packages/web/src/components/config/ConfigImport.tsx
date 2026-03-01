"use client";

import { useState, useRef } from "react";
import { Upload, FileText } from "lucide-react";
import { useConfigStore } from "@/stores/configStore";
import { configSchema } from "@subnetter/core";

export function ConfigImport() {
  const setConfig = useConfigStore((s) => s.setConfig);
  const [error, setError] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const importConfig = (text: string) => {
    setError("");
    try {
      const parsed = JSON.parse(text);
      const result = configSchema.safeParse(parsed);
      if (result.success) {
        setConfig(result.data);
        setShowPaste(false);
        setPasteValue("");
      } else {
        setError(
          `Invalid config: ${result.error.issues.map((i) => i.message).join(", ")}`
        );
      }
    } catch {
      setError("Invalid JSON format");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      importConfig(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
        >
          <Upload className="h-3 w-3" />
          Upload JSON
        </button>
        <button
          type="button"
          onClick={() => setShowPaste(!showPaste)}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
        >
          <FileText className="h-3 w-3" />
          Paste JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {showPaste && (
        <div className="space-y-2">
          <textarea
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-xs font-mono h-32"
            placeholder="Paste your JSON config here..."
          />
          <button
            type="button"
            onClick={() => importConfig(pasteValue)}
            className="rounded-md px-3 py-1.5 text-xs bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90"
          >
            Import
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
      )}
    </div>
  );
}
