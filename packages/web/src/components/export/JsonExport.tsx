"use client";

import { useAllocationStore } from "@/stores/allocationStore";
import { downloadFile } from "@/utils/download";
import { FileJson } from "lucide-react";

export function JsonExport() {
  const allocations = useAllocationStore((s) => s.allocations);

  const handleExport = () => {
    const json = JSON.stringify(allocations, null, 2);
    downloadFile(json, "allocations.json", "application/json");
  };

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <FileJson className="h-8 w-8 text-blue-600" />
        <div>
          <h3 className="font-medium">JSON Export</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Download allocations as a JSON file for programmatic use.
          </p>
        </div>
      </div>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {allocations.length} allocation(s) will be exported.
      </p>
      <button
        onClick={handleExport}
        className="w-full rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
      >
        Download JSON
      </button>
    </div>
  );
}
