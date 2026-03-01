"use client";

import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { trpc } from "@/trpc/client";
import { useConfigStore } from "@/stores/configStore";
import { ShareLinkManager } from "@/components/configs/ShareLinkManager";
import Link from "next/link";
import { History, ArrowLeft } from "lucide-react";

export default function ConfigDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <AuthGuard>
      <ConfigDetail id={params.id} />
    </AuthGuard>
  );
}

function ConfigDetail({ id }: { id: string }) {
  const { data: config, isLoading } = trpc.savedConfig.get.useQuery({ id });
  const setConfig = useConfigStore((s) => s.setConfig);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-[hsl(var(--muted-foreground))]">
          Config not found.
        </p>
      </div>
    );
  }

  const parsedConfig = JSON.parse(config.config);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/configs"
          className="rounded-md p-2 hover:bg-[hsl(var(--accent))]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{config.name}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Last updated {new Date(config.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/configs/${id}/history`}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
        >
          <History className="h-4 w-4" />
          History
        </Link>
        <button
          onClick={() => setConfig(parsedConfig)}
          className="rounded-md px-4 py-2 text-sm bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90"
        >
          Load in Builder
        </button>
      </div>

      <div className="rounded-lg border border-[hsl(var(--border))] p-4">
        <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96">
          {JSON.stringify(parsedConfig, null, 2)}
        </pre>
      </div>

      <ShareLinkManager configId={id} />
    </div>
  );
}
