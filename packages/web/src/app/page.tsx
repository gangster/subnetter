"use client";

import { ConfigForm } from "@/components/config/ConfigForm";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Config Builder</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Build your CIDR allocation configuration visually. Configure base
          CIDR, accounts, regions, and subnet types.
        </p>
      </div>
      <ConfigForm />
    </div>
  );
}
