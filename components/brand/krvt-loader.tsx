"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

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
        <div className="absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-[#d4b16a]/45 to-transparent" />
        <div className="relative overflow-hidden rounded-lg border border-[#d4b16a]/16 bg-black/55 px-5 py-4 shadow-[0_0_34px_rgba(212,177,106,0.14)]">
          <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-[#f2d58a]/12 to-transparent [animation:krvt-shimmer_4.8s_ease-in-out_infinite]" />
          <Image
            src="/loading page.png"
            alt="KRVT Library"
            width={compact ? 280 : 420}
            height={compact ? 158 : 236}
            priority
            className="h-auto w-[min(72vw,420px)] object-contain"
          />
        </div>
        <div className="mt-4 h-px w-36 overflow-hidden rounded-full bg-white/8">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#8b6426] via-[#f2d58a] to-[#a87522] [animation:krvt-loader-line_4.8s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
