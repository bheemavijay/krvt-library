import Link from "next/link";
import { ArrowRight } from "lucide-react";

type HomeSectionProps = {
  title: string;
  viewAllHref?: string;
  children: React.ReactNode;
};

export function HomeSection({ title, viewAllHref, children }: HomeSectionProps) {
  return (
    <section className="py-6 sm:py-8">
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="font-heading text-2xl font-medium text-[var(--krvt-fg)] sm:text-3xl">
            {title}
          </h2>
          {viewAllHref && (
            <Link href={viewAllHref} className="flex items-center gap-2 text-sm text-[var(--krvt-accent)] transition-colors hover:text-[var(--krvt-fg)]">
              View All
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
