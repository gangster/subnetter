"use client";

import { GitBranch, LayoutGrid } from "lucide-react";
import { cn } from "@/utils/cn";

interface VisualizationControlsProps {
  view: "tree" | "treemap";
  onViewChange: (view: "tree" | "treemap") => void;
}

export function VisualizationControls({
  view,
  onViewChange,
}: VisualizationControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[hsl(var(--muted-foreground))]">View:</span>
      <div className="flex rounded-md border border-[hsl(var(--border))]">
        <button
          onClick={() => onViewChange("tree")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm",
            view === "tree"
              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
              : "hover:bg-[hsl(var(--accent))]"
          )}
        >
          <GitBranch className="h-4 w-4" />
          Tree
        </button>
        <button
          onClick={() => onViewChange("treemap")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm",
            view === "treemap"
              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
              : "hover:bg-[hsl(var(--accent))]"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Treemap
        </button>
      </div>
    </div>
  );
}
