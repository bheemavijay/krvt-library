import { cn } from "@/lib/utils";

type LibraryHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
};

export function LibraryHeader({
  eyebrow,
  title,
  description,
  className,
}: LibraryHeaderProps) {
  return (
    <section
      className={cn(
        "rounded-[2rem] border border-border bg-panel/80 px-5 py-7 shadow-[var(--shadow)] backdrop-blur sm:px-8 sm:py-10",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.35em] text-accent">{eyebrow}</p>
      <div className="mt-4 max-w-3xl space-y-4">
        <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-muted sm:text-lg sm:leading-8">
          {description}
        </p>
      </div>
    </section>
  );
}
