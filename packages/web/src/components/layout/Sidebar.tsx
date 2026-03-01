"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings2,
  Table2,
  GitBranch,
  Download,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useUIStore } from "@/stores/uiStore";

const navItems = [
  { href: "/", label: "Config Builder", icon: Settings2 },
  { href: "/preview", label: "Allocation Preview", icon: Table2 },
  { href: "/visualization", label: "Visualization", icon: GitBranch },
  { href: "/export", label: "Export", icon: Download },
  { href: "/configs", label: "Saved Configs", icon: FolderOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-64 border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
