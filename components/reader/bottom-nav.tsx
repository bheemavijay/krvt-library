"use client";

import Link from "next/link";

type BottomNavProps = {
  previousHref?: string;
  nextHref?: string;
};

const buttonClassName =
  "inline-flex min-w-0 flex-1 items-center justify-center rounded-lg sm:rounded-full border border-white/10 bg-white/6 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white transition-all duration-200 hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";

export function BottomNav({ previousHref, nextHref }: BottomNavProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0b0e]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 sm:gap-4 px-2 sm:px-6 py-2 sm:py-3">
        {previousHref ? (
          <Link href={previousHref} className={buttonClassName}>
            Previous
          </Link>
        ) : (
          <button type="button" disabled className={buttonClassName}>
            Previous
          </button>
        )}

        {nextHref ? (
          <Link href={nextHref} className={buttonClassName}>
            Next
          </Link>
        ) : (
          <button type="button" disabled className={buttonClassName}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
