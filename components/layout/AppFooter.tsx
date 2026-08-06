"use client";

import Image from "next/image";

export function AppFooter() {
  return (
    <footer className="w-full py-12">
      <div className="mx-auto flex flex-col items-center justify-center gap-4">
        <Image
          src="/krvt-shield.svg"
          alt="KRVT"
          width={48}
          height={48}
          className="h-8 w-8 object-contain opacity-20"
        />
      </div>
    </footer>
  );
}
