"use client";

import { useAllocationStore } from "@/stores/allocationStore";
import { useCsvExport } from "@/hooks/useCsvExport";
import { FileSpreadsheet } from "lucide-react";

export function CsvExport() {
  const allocations = useAllocationStore((s) => s.allocations);
  const { exportCsv } = useCsvExport();

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-8 w-8 text-green-600" />
        <div>
          <h3 className="font-medium">CSV Export</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Download allocations as a CSV file, matching CLI output format.
          </p>
        </div>
      </div>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {allocations.length} allocation(s) will be exported.
      </p>
      <button
        onClick={() => exportCsv(allocations)}
        className="w-full rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
      >
        Download CSV
      </button>
    </div>
  );
}
