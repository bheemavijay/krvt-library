"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import NovelPageClient from "@/components/novel/novel-page-client";

function NovelPage() {
  const searchParams = useSearchParams();
  const novelId = searchParams.get("id");

  if (!novelId) {
    return <p className="p-6 text-red-400">Novel ID is missing.</p>;
  }

  return <NovelPageClient novelId={novelId} />;
}

export default function NovelPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-white/50">Loading novel...</div>}>
      <NovelPage />
    </Suspense>
  );
}