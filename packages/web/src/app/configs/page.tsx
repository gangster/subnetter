"use client";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { SavedConfigsList } from "@/components/configs/SavedConfigsList";

export default function ConfigsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Saved Configs</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Manage your saved CIDR allocation configurations.
        </p>
      </div>
      <AuthGuard>
        <SavedConfigsList />
      </AuthGuard>
    </div>
  );
}
