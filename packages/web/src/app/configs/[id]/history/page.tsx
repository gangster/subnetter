"use client";

import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { ConfigHistoryList } from "@/components/configs/ConfigHistoryList";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ConfigHistoryPage() {
  const params = useParams<{ id: string }>();

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/configs/${params.id}`}
            className="rounded-md p-2 hover:bg-[hsl(var(--accent))]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Version History
            </h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              View and restore previous versions of this configuration.
            </p>
          </div>
        </div>
        <ConfigHistoryList configId={params.id} />
      </div>
    </AuthGuard>
  );
}
