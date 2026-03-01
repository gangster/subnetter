"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import { CidrBadge } from "@/components/shared/CidrBadge";
import { AllocationTable } from "@/components/allocation/AllocationTable";
import { useAllocationStore } from "@/stores/allocationStore";
import { useEffect } from "react";

export default function SharedConfigPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = trpc.share.resolve.useQuery({ id: params.id });
  const setAllocations = useAllocationStore((s) => s.setAllocations);

  useEffect(() => {
    if (data?.allocations) {
      setAllocations(data.allocations);
    }
  }, [data, setAllocations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold">Link not found</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          This shared config link may have expired or been revoked.
        </p>
      </div>
    );
  }

  const config = JSON.parse(data.config);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Shared configuration (read-only)
        </p>
      </div>

      <div className="rounded-lg border border-[hsl(var(--border))] p-4">
        <h2 className="text-sm font-medium mb-2">Configuration</h2>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            Base CIDR:
          </span>
          <CidrBadge cidr={config.baseCidr} />
        </div>
        <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-64 bg-[hsl(var(--muted))] rounded p-3">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      {data.allocations && data.allocations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Allocations ({data.allocations.length})
          </h2>
          <AllocationTable />
        </div>
      )}
    </div>
  );
}
