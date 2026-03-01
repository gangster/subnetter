"use client";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <Sidebar />
      <main className="lg:pl-64">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
