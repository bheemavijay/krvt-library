import Link from "next/link";

import { ImportBox } from "@/components/import-box";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Import Novel | KRVT Library",
  description: "Add novels to your local library.",
};

export default function ImportPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 py-6 sm:py-10">

      {/* HEADER */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">
          LIBRARY INPUT
        </p>
        <h1 className="font-heading text-3xl font-semibold text-foreground sm:text-4xl">
          Import Novel
        </h1>
        <p className="text-sm text-muted sm:text-base">
          Import using URL, paste content, or upload file.
        </p>
      </div>

      {/* ✅ SINGLE SOURCE (ALL IMPORT TYPES) */}
      <ImportBox />

      {/* BACK BUTTON */}
      <div className="mt-6 flex justify-center">
        <Link href="/">
          <Button className="px-6 border border-white/10 bg-white/5 hover:bg-white/10">
            ← Back to Library
          </Button>
        </Link>
      </div>
    </main>
  );
}