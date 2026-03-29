import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      {/* Large 404 */}
      <div className="mb-6 text-8xl font-bold text-muted-foreground/20 select-none">
        404
      </div>

      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Search className="size-7" />
      </div>

      <h1 className="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
        Page not found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
        Sorry, we couldn&#39;t find the page you&#39;re looking for. It may have been
        moved, deleted, or the URL might be incorrect.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button render={<Link href="/" />}>
          <Home className="mr-2 size-4" />
          Back to home
        </Button>
        <Button variant="outline" render={<Link href="/contact" />}>
          Contact support
        </Button>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Looking for something specific?{" "}
        <Link href="/blog" className="text-primary hover:underline">
          Browse our blog
        </Link>{" "}
        or{" "}
        <Link href="/about" className="text-primary hover:underline">
          learn about us
        </Link>
        .
      </p>
    </div>
  );
}
