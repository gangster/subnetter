import type { Metadata } from "next";
import { TRPCProvider } from "@/trpc/provider";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subnetter - CIDR Allocation Tool",
  description:
    "Visual IPv4 CIDR allocation tool for multi-cloud infrastructure",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[hsl(var(--background))] font-sans antialiased">
        <TRPCProvider>
          <AppShell>{children}</AppShell>
        </TRPCProvider>
      </body>
    </html>
  );
}
