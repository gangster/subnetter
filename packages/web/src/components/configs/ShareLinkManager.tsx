"use client";

import { trpc } from "@/trpc/client";
import { useState } from "react";
import { Link2, Copy, Trash2, Check, Plus, Loader2 } from "lucide-react";

interface ShareLinkManagerProps {
  configId: string;
}

export function ShareLinkManager({ configId }: ShareLinkManagerProps) {
  const {
    data: links,
    isLoading,
    refetch,
  } = trpc.share.list.useQuery({ configId });
  const createMutation = trpc.share.create.useMutation({
    onSuccess: () => refetch(),
  });
  const revokeMutation = trpc.share.revoke.useMutation({
    onSuccess: () => refetch(),
  });
  const [includeAllocations, setIncludeAllocations] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = () => {
    createMutation.mutate({ configId, includeAllocations });
  };

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}/shared/${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          <h3 className="text-sm font-medium">Share Links</h3>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={includeAllocations}
              onChange={(e) => setIncludeAllocations(e.target.checked)}
              className="rounded"
            />
            Include allocations
          </label>
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Create Link
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {links && links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded-md bg-[hsl(var(--muted))] px-3 py-2"
            >
              <div className="flex-1">
                <code className="text-xs font-mono">
                  /shared/{link.id}
                </code>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  {link.includeAllocations ? "With allocations" : "Config only"}
                  {link.expiresAt &&
                    ` \u00b7 Expires ${new Date(link.expiresAt).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyLink(link.id)}
                  className="rounded-md p-1.5 hover:bg-[hsl(var(--accent))]"
                >
                  {copiedId === link.id ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
                <button
                  onClick={() => revokeMutation.mutate({ id: link.id })}
                  className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {links && links.length === 0 && (
        <p className="text-sm text-center text-[hsl(var(--muted-foreground))] py-2">
          No share links yet.
        </p>
      )}
    </div>
  );
}
