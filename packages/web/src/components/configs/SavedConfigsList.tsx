"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Trash2, ExternalLink, Loader2 } from "lucide-react";

export function SavedConfigsList() {
  const { data: configs, isLoading, refetch } = trpc.savedConfig.list.useQuery();
  const deleteMutation = trpc.savedConfig.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!configs || configs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-12 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">
          No saved configs yet. Use the Config Builder to create and save a
          configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {configs.map((config) => (
        <div
          key={config.id}
          className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-4 hover:bg-[hsl(var(--muted)/0.5)]"
        >
          <div className="flex-1">
            <Link
              href={`/configs/${config.id}`}
              className="font-medium hover:underline"
            >
              {config.name}
            </Link>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Updated {new Date(config.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/configs/${config.id}`}
              className="rounded-md p-2 hover:bg-[hsl(var(--accent))]"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button
              onClick={() => deleteMutation.mutate({ id: config.id })}
              disabled={deleteMutation.isPending}
              className="rounded-md p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
