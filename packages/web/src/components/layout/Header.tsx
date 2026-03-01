"use client";

import Link from "next/link";
import { Network, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";
import { useUIStore } from "@/stores/uiStore";

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.95)] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background)/0.6)]">
      <div className="flex h-14 items-center px-4 gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-2 hover:bg-[hsl(var(--accent))] lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Network className="h-5 w-5 text-[hsl(var(--primary))]" />
          <span>Subnetter</span>
        </Link>

        <div className="flex-1" />

        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
