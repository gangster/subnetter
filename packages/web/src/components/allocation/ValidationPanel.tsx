"use client";

import { useAllocationStore } from "@/stores/allocationStore";
import { trpc } from "@/trpc/client";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

export function ValidationPanel() {
  const allocations = useAllocationStore((s) => s.allocations);
  const validationResult = useAllocationStore((s) => s.validationResult);
  const setValidationResult = useAllocationStore((s) => s.setValidationResult);

  const validateMutation = trpc.allocation.validate.useMutation({
    onSuccess: (result) => setValidationResult(result),
  });

  const handleValidate = () => {
    validateMutation.mutate({ allocations });
  };

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Overlap Validation</h3>
        <button
          onClick={handleValidate}
          disabled={validateMutation.isPending || allocations.length === 0}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs bg-[hsl(var(--secondary))] hover:opacity-90 disabled:opacity-50"
        >
          {validateMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ShieldCheck className="h-3 w-3" />
          )}
          Validate
        </button>
      </div>

      {validationResult && (
        <div className="mt-3">
          {validationResult.valid ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-medium">
                No overlapping CIDRs detected
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[hsl(var(--destructive))]">
                <ShieldAlert className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {validationResult.overlaps.length} overlap(s) detected
                </span>
              </div>
              <ul className="space-y-1 text-xs">
                {validationResult.overlaps.map((o, i) => (
                  <li
                    key={i}
                    className="rounded bg-[hsl(var(--destructive)/0.1)] px-3 py-2"
                  >
                    <span className="font-mono">{o.cidr1}</span>
                    {" overlaps with "}
                    <span className="font-mono">{o.cidr2}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
