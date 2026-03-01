"use client";

import { trpc } from "@/trpc/client";
import { RotateCcw, Loader2 } from "lucide-react";

interface ConfigHistoryListProps {
  configId: string;
}

export function ConfigHistoryList({ configId }: ConfigHistoryListProps) {
  const {
    data: versions,
    isLoading,
    refetch,
  } = trpc.configHistory.list.useQuery({ configId });
  const restoreMutation = trpc.configHistory.restore.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-12 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">
          No version history yet. Versions are created automatically when you
          update a config.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <div
          key={version.id}
          className="rounded-lg border border-[hsl(var(--border))] p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium">
                {new Date(version.createdAt).toLocaleString()}
              </p>
              {version.message && (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {version.message}
                </p>
              )}
            </div>
            <button
              onClick={() =>
                restoreMutation.mutate({
                  configId,
                  versionId: version.id,
                })
              }
              disabled={restoreMutation.isPending}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              Restore
            </button>
          </div>
          <pre className="text-xs font-mono bg-[hsl(var(--muted))] rounded p-3 overflow-auto max-h-32">
            {JSON.stringify(JSON.parse(version.config), null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}
