"use client";

import { useAllocationStore } from "@/stores/allocationStore";

export function AllocationSummary() {
  const allocations = useAllocationStore((s) => s.allocations);

  const providers = new Set(allocations.map((a) => a.cloudProvider));
  const accounts = new Set(allocations.map((a) => a.accountName));
  const regions = new Set(allocations.map((a) => a.regionName));
  const totalIps = allocations.reduce((sum, a) => sum + a.usableIps, 0);

  const stats = [
    { label: "Total Subnets", value: allocations.length },
    { label: "Providers", value: providers.size },
    { label: "Accounts", value: accounts.size },
    { label: "Regions", value: regions.size },
    { label: "Total Usable IPs", value: totalIps.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-[hsl(var(--border))] p-4"
        >
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {stat.label}
          </p>
          <p className="text-2xl font-bold mt-1">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
