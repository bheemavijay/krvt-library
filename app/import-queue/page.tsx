"use client";

import { Suspense } from "react";
import { KrvtLoader } from "@/components/brand/krvt-loader";
import { ImportQueueClient } from "@/components/import-queue/import-queue-client";

export default function ImportQueuePage() {
  return (
    <Suspense fallback={<KrvtLoader />}>
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
        <ImportQueueClient />
      </div>
    </Suspense>
  );
}