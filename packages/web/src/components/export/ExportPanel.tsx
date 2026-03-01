"use client";

import { useAllocationStore } from "@/stores/allocationStore";
import { CsvExport } from "./CsvExport";
import { JsonExport } from "./JsonExport";

export function ExportPanel() {
  const allocations = useAllocationStore((s) => s.allocations);

  if (allocations.length === 0) {
    return (
      <div className="rounded-lg border border-[hsl(var(--border))] p-12 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">
          No allocations to export. Go to the Config Builder to generate
          allocations first.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CsvExport />
      <JsonExport />
    </div>
  );
}
