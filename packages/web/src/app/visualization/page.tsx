"use client";

import { CidrTree } from "@/components/visualization/CidrTree";
import { CidrTreemap } from "@/components/visualization/CidrTreemap";
import { VisualizationControls } from "@/components/visualization/VisualizationControls";
import { useAllocationStore } from "@/stores/allocationStore";
import { useConfigStore } from "@/stores/configStore";
import { useState } from "react";

export default function VisualizationPage() {
  const allocations = useAllocationStore((s) => s.allocations);
  const config = useConfigStore((s) => s.config);
  const [view, setView] = useState<"tree" | "treemap">("tree");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visualization</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Explore your CIDR allocations as an interactive tree or treemap
          visualization.
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
          <VisualizationControls view={view} onViewChange={setView} />
          {view === "tree" ? (
            <CidrTree
              allocations={allocations}
              baseCidr={config.baseCidr || ""}
            />
          ) : (
            <CidrTreemap
              allocations={allocations}
              baseCidr={config.baseCidr || ""}
            />
          )}
        </>
      )}
    </div>
  );
}
