import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-muted">Missing story</p>
      <h1 className="font-heading text-3xl text-foreground">This novel could not be found.</h1>
      <p className="max-w-md text-sm leading-7 text-muted">
        The requested page does not exist in the current mock library.
      </p>
      <Button href="/">Return to library</Button>
    </main>
  );
}
