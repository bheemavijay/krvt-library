"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookOpen,
  Download,
  Menu,
  Search,
  Settings,
  Tags,
  Upload,
  X,
} from "lucide-react";

type GlobalHeaderProps = {
  onOpenSettings: () => void;
};

export function GlobalHeader({ onOpenSettings }: GlobalHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      router.push(`/?q=${encodeURIComponent(searchQuery)}`);
      setIsMenuOpen(false);
      setIsMobileSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#d4b16a]/10 bg-black/90 shadow-[0_10px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <Link
        href="/"
        aria-label="KRVT Library home"
        className="pointer-events-auto absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      >
        <span className="relative inline-flex items-center gap-2 border-y border-[#d4b16a]/18 bg-black/20 px-2.5 py-1 sm:px-4">
          <span className="hidden h-px w-5 bg-gradient-to-r from-transparent via-[#d4b16a]/55 to-[#d4b16a]/10 sm:block" />
          <span className="font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-transparent [background-image:linear-gradient(180deg,#fff0b2_0%,#d3ad5b_56%,#8f6728_100%)] [background-clip:text] [text-shadow:0_1px_12px_rgba(212,177,106,0.18)] sm:text-sm md:text-[15px]">
            KRVT Library
          </span>
          <span className="hidden h-px w-5 bg-gradient-to-l from-transparent via-[#d4b16a]/55 to-[#d4b16a]/10 sm:block" />
        </span>
      </Link>

      <div className="relative mx-auto flex min-h-[48px] max-w-screen-2xl items-center justify-between gap-2 px-3 sm:min-h-[56px] sm:px-4 md:px-6 lg:px-8">
        <Link href="/" className="relative z-10 inline-flex shrink-0 items-center text-white" aria-label="KRVT home">
          <Image
            src="/logo.png"
            alt="KRVT"
            width={48}
            height={48}
            className="h-9 w-9 object-contain drop-shadow-[0_0_12px_rgba(224,188,82,0.22)] sm:h-10 sm:w-10"
            priority
          />
        </Link>

        <div className="relative z-10 flex items-center justify-end gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search..."
              className="h-7 w-32 rounded-md border border-[#d4b16a]/12 bg-black/35 px-2.5 text-xs text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#d4b16a]/35 md:w-48"
            />
          </div>

          <button
            onClick={() => setIsMobileSearchOpen((current) => !current)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d4b16a]/12 bg-black/35 text-white/75 transition-colors hover:border-[#d4b16a]/35 hover:bg-[#d4b16a]/10 hover:text-[#f0d99a] sm:hidden"
            aria-label="Search"
          >
            <Search size={15} />
          </button>

          <button
            onClick={onOpenSettings}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d4b16a]/12 bg-black/35 text-white/75 transition-colors hover:border-[#d4b16a]/35 hover:bg-[#d4b16a]/10 hover:text-[#f0d99a]"
            aria-label="Settings"
          >
            <Settings size={15} />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen((current) => !current)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d4b16a]/12 bg-black/35 text-white/75 transition-colors hover:border-[#d4b16a]/35 hover:bg-[#d4b16a]/10 hover:text-[#f0d99a]"
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 top-full mt-2 z-50 w-48 overflow-hidden rounded-lg border border-[#d4b16a]/14 bg-[#08090c] py-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.72)] ring-1 ring-white/5">
                <nav className="flex flex-col gap-0.5 px-1.5">
                  <MenuLink href="/?view=history&tab=bookmarks" label="Bookmarks" icon={<Bookmark size={15} />} onClick={() => setIsMenuOpen(false)} />
                  <MenuLink href="/?view=library" label="Downloads" icon={<Download size={15} />} onClick={() => setIsMenuOpen(false)} />
                  <MenuLink href="/?view=novels" label="Genres" icon={<BookOpen size={15} />} onClick={() => setIsMenuOpen(false)} />
                  <MenuLink href="/?view=novels" label="Tags" icon={<Tags size={15} />} onClick={() => setIsMenuOpen(false)} />
                  <div className="mx-2 my-1 h-px bg-[#d4b16a]/10" />
                  <MenuLink href="/import" label="Import Novel" icon={<Upload size={15} />} onClick={() => setIsMenuOpen(false)} />
                </nav>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isMobileSearchOpen ? (
        <div className="border-t border-[#d4b16a]/10 px-3 pb-3 sm:hidden">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search..."
            className="mt-2.5 h-8 w-full rounded-md border border-[#d4b16a]/12 bg-black/35 px-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#d4b16a]/35"
          />
        </div>
      ) : null}
    </header>
  );
}

function MenuLink({
  href,
  label,
  icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-white/75 transition-colors hover:bg-white/[0.055] hover:text-[#f0d99a]"
    >
      <span className="text-[#d4b16a]/80">{icon}</span>
      {label}
    </Link>
  );
}