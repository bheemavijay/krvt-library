"use client";

import Link from "next/link";

type BottomNavProps = {
  previousHref?: string;
  nextHref?: string;
};

const buttonClassName =
  "inline-flex min-w-[120px] items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white backdrop-blur hover:border-white/20 hover:bg-white/10 disabled:opacity-40";

export function BottomNav({ previousHref, nextHref }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 w-full z-40 border-t border-white/10 bg-[#0d0c12]/90 backdrop-blur-xl">
      <div className="w-full px-4 flex justify-between py-3">

        {/* PREVIOUS */}
        {previousHref ? (
          <Link href={previousHref} className={buttonClassName}>
            Previous
          </Link>
        ) : (
          <button disabled className={buttonClassName}>
            Previous
          </button>
        )}

        {/* NEXT */}
        {nextHref ? (
          <Link href={nextHref} className={buttonClassName}>
            Next
          </Link>
        ) : (
          <button disabled className={buttonClassName}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}