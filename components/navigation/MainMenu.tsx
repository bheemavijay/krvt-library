"use client";

import Link from "next/link";
import { Bookmark, BookOpen, Download, Tags, Upload } from "lucide-react";

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
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--krvt-fg)]/80 transition-colors hover:bg-[var(--krvt-accent-soft)] hover:text-[var(--krvt-accent)]"
    >
      <span className="text-[var(--krvt-accent)]/80">{icon}</span>
      {label}
    </Link>
  );
}

export function MainMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-56 overflow-hidden rounded-lg border border-[var(--krvt-border)] bg-[var(--krvt-panel)] py-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.72)] ring-1 ring-black/20">
      <nav className="flex flex-col gap-0.5 px-1.5">
        <MenuLink href="/?view=history" label="Bookmarks" icon={<Bookmark size={16} />} onClick={onNavigate} />
        <MenuLink href="/?view=library" label="Library" icon={<Download size={16} />} onClick={onNavigate} />
        <MenuLink href="/?view=novels" label="Browse" icon={<BookOpen size={16} />} onClick={onNavigate} />
        <div className="mx-2 my-1 h-px bg-[var(--krvt-border)]" />
        <MenuLink href="/import" label="Import Novel" icon={<Upload size={16} />} onClick={onNavigate} />
      </nav>
    </div>
  );
}
