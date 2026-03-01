"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, User } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isPending) {
    return <div className="h-8 w-8 rounded-full bg-[hsl(var(--muted))] animate-pulse" />;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-[hsl(var(--accent))]"
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium"
      >
        {session.user.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-1 shadow-lg">
          <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
            <p className="text-sm font-medium">{session.user.name}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {session.user.email}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              setOpen(false);
              router.refresh();
            }}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
