"use client";

import { useAllocationStore } from "@/stores/allocationStore";
import { X } from "lucide-react";

export function AllocationFilters() {
  const allocations = useAllocationStore((s) => s.allocations);
  const filters = useAllocationStore((s) => s.filters);
  const setFilter = useAllocationStore((s) => s.setFilter);
  const clearFilters = useAllocationStore((s) => s.clearFilters);

  const providers = [...new Set(allocations.map((a) => a.cloudProvider))];
  const accounts = [...new Set(allocations.map((a) => a.accountName))];
  const regions = [...new Set(allocations.map((a) => a.regionName))];

  const hasFilters = filters.provider || filters.account || filters.region;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.provider || ""}
        onChange={(e) => setFilter("provider", e.target.value || null)}
        className="rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-1.5 text-sm"
      >
        <option value="">All Providers</option>
        {providers.map((p) => (
          <option key={p} value={p}>
            {p.toUpperCase()}
          </option>
        ))}
      </select>

      <select
        value={filters.account || ""}
        onChange={(e) => setFilter("account", e.target.value || null)}
        className="rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-1.5 text-sm"
      >
        <option value="">All Accounts</option>
        {accounts.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <select
        value={filters.region || ""}
        onChange={(e) => setFilter("region", e.target.value || null)}
        className="rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-1.5 text-sm"
      >
        <option value="">All Regions</option>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
        >
          <X className="h-3 w-3" />
          Clear filters
        </button>
      )}
    </div>
  );
}
