"use client";

import Image from "next/image";
import { cn } from "@/shared/utils";

type KrvtLoaderProps = {
  compact?: boolean;
  className?: string;
};

export function KrvtLoader({ compact = false, className }: KrvtLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[45vh] items-center justify-center bg-black text-white",
        className,
      )}
    >
      <div className="relative flex flex-col items-center">
        <div className="relative overflow-hidden px-3 py-2">
          <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-[#f2d58a]/10 to-transparent [animation:krvt-shimmer_5.8s_ease-in-out_infinite]" />
          <Image
            src="/logo.png"
            alt="KRVT Library"
            width={compact ? 132 : 190}
            height={compact ? 132 : 190}
            priority
            className="h-auto w-[min(46vw,190px)] object-contain opacity-90"
          />
        </div>
        <div className="mt-3 h-px w-24 overflow-hidden rounded-full bg-white/7">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#d4b16a]/80 to-transparent [animation:krvt-loader-line_5.8s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
