"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReaderPageClient } from "@/components/reader/reader-page-client";

function ReaderPage() {
  const searchParams = useSearchParams();
  const novelId = searchParams.get("id");
  const chapterParam = searchParams.get("chapter");

  if (!novelId || !chapterParam) {
    return <p className="p-6 text-red-400">Novel ID or chapter is missing.</p>;
  }

  return <ReaderPageClient novelId={novelId} chapterParam={chapterParam} />;
}

export default function ReaderPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-white/50">Loading reader...</div>}>
      <ReaderPage />
    </Suspense>
  );
}