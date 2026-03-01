"use client";

import { useAllocationStore } from "@/stores/allocationStore";
import { ProviderIcon } from "@/components/shared/ProviderIcon";
import { CidrBadge } from "@/components/shared/CidrBadge";
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { Allocation } from "@subnetter/core";

type SortKey = keyof Allocation;

export function AllocationTable() {
  const allocations = useAllocationStore((s) => s.allocations);
  const filters = useAllocationStore((s) => s.filters);
  const validationResult = useAllocationStore((s) => s.validationResult);
  const [sortKey, setSortKey] = useState<SortKey>("cloudProvider");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const overlapCidrs = useMemo(() => {
    if (!validationResult?.overlaps) return new Set<string>();
    const cidrs = new Set<string>();
    for (const o of validationResult.overlaps) {
      cidrs.add(o.cidr1);
      cidrs.add(o.cidr2);
    }
    return cidrs;
  }, [validationResult]);

  const filtered = useMemo(() => {
    let result = allocations;
    if (filters.provider) result = result.filter((a) => a.cloudProvider === filters.provider);
    if (filters.account) result = result.filter((a) => a.accountName === filters.account);
    if (filters.region) result = result.filter((a) => a.regionName === filters.region);
    return result;
  }, [allocations, filters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = typeof aVal === "number" && typeof bVal === "number"
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const columns: { key: SortKey; label: string }[] = [
    { key: "cloudProvider", label: "Provider" },
    { key: "accountName", label: "Account" },
    { key: "regionName", label: "Region" },
    { key: "availabilityZone", label: "AZ" },
    { key: "subnetCidr", label: "Subnet CIDR" },
    { key: "subnetRole", label: "Role" },
    { key: "usableIps", label: "Usable IPs" },
  ];

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))] cursor-pointer hover:text-[hsl(var(--foreground))]"
                onClick={() => toggleSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((alloc, i) => {
            const hasOverlap = overlapCidrs.has(alloc.subnetCidr);
            return (
              <tr
                key={i}
                className={`border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)] ${hasOverlap ? "bg-[hsl(var(--destructive)/0.1)]" : ""}`}
              >
                <td className="px-4 py-2">
                  <ProviderIcon provider={alloc.cloudProvider} showLabel />
                </td>
                <td className="px-4 py-2">{alloc.accountName}</td>
                <td className="px-4 py-2">{alloc.regionName}</td>
                <td className="px-4 py-2 text-xs">{alloc.availabilityZone}</td>
                <td className="px-4 py-2">
                  <CidrBadge cidr={alloc.subnetCidr} />
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[hsl(var(--secondary))]">
                    {alloc.subnetRole}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  {alloc.usableIps.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">
          No allocations match current filters.
        </div>
      )}
    </div>
  );
}
