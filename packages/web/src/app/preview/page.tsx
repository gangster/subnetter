"use client";

import { AllocationTable } from "@/components/allocation/AllocationTable";
import { AllocationFilters } from "@/components/allocation/AllocationFilters";
import { AllocationSummary } from "@/components/allocation/AllocationSummary";
import { ValidationPanel } from "@/components/allocation/ValidationPanel";
import { useAllocationStore } from "@/stores/allocationStore";

export default function PreviewPage() {
  const allocations = useAllocationStore((s) => s.allocations);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Allocation Preview
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          View generated subnet allocations, filter by provider/account/region,
          and validate for overlaps.
        </p>
      </div>

      {allocations.length === 0 ? (
        <div className="rounded-lg border border-[hsl(var(--border))] p-12 text-center">
          <p className="text-[hsl(var(--muted-foreground))]">
            No allocations yet. Go to the Config Builder to generate
            allocations.
          </p>
        </div>
      ) : (
        <>
          <AllocationSummary />
          <ValidationPanel />
          <AllocationFilters />
          <AllocationTable />
        </>
      )}
    </div>
  );
}
