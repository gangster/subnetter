"use client";

import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { LogIn } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <LogIn className="h-12 w-12 text-[hsl(var(--muted-foreground))]" />
        <h2 className="text-xl font-semibold">Sign in required</h2>
        <p className="text-[hsl(var(--muted-foreground))] text-center max-w-md">
          You need to be signed in to access this feature. Create a free account
          to save configs, export data, and share with others.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:opacity-90"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-md border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--accent))]"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
