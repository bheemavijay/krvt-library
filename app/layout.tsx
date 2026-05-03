import type { Metadata } from "next";
import "./globals.css";

import { SiteShell } from "@/components/layout/site-shell";

export const metadata: Metadata = {
  title: "KRVT Library",
  description: "A premium personal novel library and reader experience.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-black text-white">
        <SiteShell>
          {children}
        </SiteShell>
      </body>
    </html>
  );
}