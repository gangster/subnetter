"use client";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { ExportPanel } from "@/components/export/ExportPanel";

export default function ExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Download your allocation data as CSV or JSON.
        </p>
      </div>
      <AuthGuard>
        <ExportPanel />
      </AuthGuard>
    </div>
  );
}
