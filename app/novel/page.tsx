"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { KrvtLoader } from "@/components/brand/krvt-loader";
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
    <Suspense fallback={<KrvtLoader />}>
      <NovelPage />
    </Suspense>
  );
}
