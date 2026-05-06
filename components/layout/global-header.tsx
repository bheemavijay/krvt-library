"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Settings, X } from "lucide-react";

type GlobalHeaderProps = {
  onOpenSettings: () => void;
};

export function GlobalHeader({ onOpenSettings }: GlobalHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      router.push(`/?q=${encodeURIComponent(searchQuery)}`);
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-[56px] max-w-screen-2xl items-center justify-between px-3 sm:min-h-[64px] sm:px-4 md:px-6 lg:px-8">
        <Link href="/" className="inline-flex shrink-0 items-center gap-2 text-white sm:gap-3">
          <Image
            src="/logo.png"
            alt="KRVT Library logo"
            width={40}
            height={40}
            className="h-8 w-8 object-contain sm:h-10 sm:w-10"
            priority
          />
          <span className="max-w-[120px] truncate text-base font-semibold tracking-wide sm:max-w-none sm:text-lg">
            KRVT Library
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:block">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search..."
              className="w-48 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition-colors focus:border-white/20 md:w-64"
            />
          </div>

          <button
            onClick={onOpenSettings}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0f1115] py-2 shadow-xl">
                <div className="mb-2 border-b border-white/10 px-4 py-2 sm:hidden">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={handleSearch}
                    placeholder="Search..."
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none transition-colors focus:border-white/20"
                  />
                </div>
                <nav className="flex flex-col">
                  <MenuLink href="/" label="Home" onClick={() => setIsMenuOpen(false)} />
                  <MenuLink href="/?view=novels" label="Novels" onClick={() => setIsMenuOpen(false)} />
                  <MenuLink href="/?view=rankings" label="Rankings" onClick={() => setIsMenuOpen(false)} />
                  <MenuLink href="/?view=updates" label="Updates" onClick={() => setIsMenuOpen(false)} />
                  <MenuLink href="/?view=library" label="Library" onClick={() => setIsMenuOpen(false)} />
                  <div className="my-1 border-t border-white/10" />
                  <MenuLink href="/import" label="Import Novel" accent onClick={() => setIsMenuOpen(false)} />
                </nav>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  label,
  accent = false,
  onClick,
}: {
  href: string;
  label: string;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${
        accent ? "font-medium text-[#d4b16a]" : "text-white/80 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
