"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, Settings, X } from "lucide-react";
import { MainMenu } from "@/components/navigation/MainMenu";

type AppHeaderProps = {
  onOpenSettings: () => void;
};

export function AppHeader({ onOpenSettings }: AppHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && searchQuery.trim()) {
      router.push(`/?view=novels&q=${encodeURIComponent(searchQuery)}`);
      setIsMenuOpen(false);
      setIsMobileSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--krvt-border)] bg-[var(--krvt-panel)] shadow-[var(--krvt-shadow)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-[90px] max-w-screen-2xl items-center justify-between gap-2 px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Left Side */}
        <div className="relative z-10 flex items-center">
          <Link href="/" className="inline-flex shrink-0 items-center text-[var(--krvt-fg)]" aria-label="KRVT home">
            <Image
              src="/logo.png"
              alt="KRVT"
              width={64}
              height={64}
              className="h-12 w-12 object-contain drop-shadow-[0_0_12px_rgba(224,188,82,0.22)]"
              priority
            />
          </Link>
        </div>

        {/* Center Title */}
        <div className="pointer-events-none absolute inset-x-0 flex h-full items-center justify-center">
            <h1 className="font-heading text-lg font-medium uppercase tracking-[0.24em] text-[var(--krvt-accent)] [text-shadow:0_1px_12px_rgba(212,177,106,0.18)] sm:text-xl md:text-2xl">
              KRVT Library
            </h1>
        </div>

        {/* Right Side */}
        <div className="relative z-10 flex items-center justify-end gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search..."
              className="h-9 w-32 rounded-md border border-[var(--krvt-border)] bg-[var(--krvt-panel-strong)] px-3 text-sm text-[var(--krvt-fg)] outline-none transition-colors placeholder:text-[var(--krvt-fg)]/40 focus:border-[var(--krvt-accent)]/50 md:w-48"
            />
          </div>

          <button
            onClick={() => setIsMobileSearchOpen((current) => !current)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--krvt-border)] bg-[var(--krvt-panel-strong)] text-[var(--krvt-fg)]/80 transition-colors hover:border-[var(--krvt-accent)]/50 hover:bg-[var(--krvt-accent-soft)] hover:text-[var(--krvt-accent)] sm:hidden"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          <button
            onClick={onOpenSettings}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--krvt-border)] bg-[var(--krvt-panel-strong)] text-[var(--krvt-fg)]/80 transition-colors hover:border-[var(--krvt-accent)]/50 hover:bg-[var(--krvt-accent-soft)] hover:text-[var(--krvt-accent)]"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--krvt-border)] bg-[var(--krvt-panel-strong)] text-[var(--krvt-fg)]/80 transition-colors hover:border-[var(--krvt-accent)]/50 hover:bg-[var(--krvt-accent-soft)] hover:text-[var(--krvt-accent)]"
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {isMenuOpen && <MainMenu onNavigate={() => setIsMenuOpen(false)} />}
          </div>
        </div>
      </div>

      {isMobileSearchOpen && (
        <div className="border-t border-[var(--krvt-border)] px-3 pb-3 sm:hidden">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search library..."
            className="mt-3 h-9 w-full rounded-md border border-[var(--krvt-border)] bg-[var(--krvt-panel-strong)] px-3 text-sm text-[var(--krvt-fg)] outline-none transition-colors placeholder:text-[var(--krvt-fg)]/40 focus:border-[var(--krvt-accent)]/50"
          />
        </div>
      )}
    </header>
  );
}
